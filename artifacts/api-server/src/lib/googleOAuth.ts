import { eq } from "drizzle-orm";
import { db, usersTable, type User } from "@workspace/db";
import { encryptSecret, decryptSecret } from "./crypto";
import { logger } from "./logger";

export const GOOGLE_OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive.file",
];

const ACCESS_TOKEN_REFRESH_BUFFER_MS = 60 * 1000;

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
}

export function getOAuthConfig(): GoogleOAuthConfig | null {
  const clientId = process.env["GOOGLE_OAUTH_CLIENT_ID"];
  const clientSecret = process.env["GOOGLE_OAUTH_CLIENT_SECRET"];
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function getRedirectUri(): string {
  const explicit = process.env["GOOGLE_OAUTH_REDIRECT_URI"];
  if (explicit) return explicit;
  const host =
    process.env["REPLIT_DOMAINS"]?.split(",")[0]?.trim() ||
    process.env["REPLIT_DEV_DOMAIN"] ||
    "fileray.io";
  return `https://${host}/api/auth/google/callback`;
}

export function buildAuthorizationUrl(state: string): string {
  const cfg = getOAuthConfig();
  if (!cfg) throw new Error("Google OAuth not configured");
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: GOOGLE_OAUTH_SCOPES.join(" "),
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  id_token?: string;
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const cfg = getOAuthConfig();
  if (!cfg) throw new Error("Google OAuth not configured");
  const body = new URLSearchParams({
    code,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uri: getRedirectUri(),
    grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }
  return (await res.json()) as GoogleTokenResponse;
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const body = new URLSearchParams({ token: refreshToken });
  const res = await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // Treat already-revoked / invalid tokens as a successful revoke so account
    // deletion can still proceed.
    if (res.status === 400 && text.includes("invalid_token")) {
      logger.info("Refresh token was already invalid when revoking");
      return;
    }
    throw new Error(`Token revocation failed (${res.status}): ${text}`);
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const cfg = getOAuthConfig();
  if (!cfg) throw new Error("Google OAuth not configured");
  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${text}`);
  }
  return (await res.json()) as GoogleTokenResponse;
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

export async function fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch user info (${res.status}): ${text}`);
  }
  return (await res.json()) as GoogleUserInfo;
}

export async function upsertUserFromOAuth(
  info: GoogleUserInfo,
  tokens: GoogleTokenResponse,
): Promise<User> {
  const expiry = new Date(Date.now() + tokens.expires_in * 1000);
  const updates: Partial<User> = {
    email: info.email,
    displayName: info.name ?? null,
    photoUrl: info.picture ?? null,
    accessToken: tokens.access_token,
    accessTokenExpiry: expiry,
    updatedAt: new Date(),
  };
  if (tokens.refresh_token) {
    updates.encryptedRefreshToken = encryptSecret(tokens.refresh_token);
  }

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.googleId, info.sub))
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.googleId, info.sub))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(usersTable)
    .values({
      googleId: info.sub,
      email: info.email,
      displayName: info.name ?? null,
      photoUrl: info.picture ?? null,
      accessToken: tokens.access_token,
      accessTokenExpiry: expiry,
      encryptedRefreshToken: tokens.refresh_token
        ? encryptSecret(tokens.refresh_token)
        : null,
    })
    .returning();
  return created;
}

export async function loadUserById(userId: number): Promise<User | null> {
  const rows = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return rows[0] ?? null;
}

/**
 * Returns a usable access token for the user, refreshing it if it's expired
 * or about to expire. Persists the new token to the database.
 */
export async function getValidAccessToken(
  user: User,
  options: { forceRefresh?: boolean } = {},
): Promise<string> {
  const expiringSoon =
    !user.accessTokenExpiry ||
    user.accessTokenExpiry.getTime() - Date.now() < ACCESS_TOKEN_REFRESH_BUFFER_MS;

  if (!options.forceRefresh && user.accessToken && !expiringSoon) {
    return user.accessToken;
  }

  if (!user.encryptedRefreshToken) {
    throw new Error("User has no refresh token; they must sign in again.");
  }

  let refreshToken: string;
  try {
    refreshToken = decryptSecret(user.encryptedRefreshToken);
  } catch (err) {
    logger.error({ err, userId: user.id }, "Failed to decrypt refresh token");
    throw new Error("Stored refresh token could not be decrypted; user must sign in again.");
  }

  const tokens = await refreshAccessToken(refreshToken);
  const expiry = new Date(Date.now() + tokens.expires_in * 1000);

  const updates: Partial<User> = {
    accessToken: tokens.access_token,
    accessTokenExpiry: expiry,
    updatedAt: new Date(),
  };
  if (tokens.refresh_token) {
    updates.encryptedRefreshToken = encryptSecret(tokens.refresh_token);
  }

  await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id));

  user.accessToken = tokens.access_token;
  user.accessTokenExpiry = expiry;

  return tokens.access_token;
}
