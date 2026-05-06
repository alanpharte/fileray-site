import type { RequestHandler } from "express";
import { currentUserStore } from "../lib/currentUser";
import { getValidAccessToken, loadUserById } from "../lib/googleOAuth";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    oauthState?: string;
  }
}

export const currentUserMiddleware: RequestHandler = (req, res, next) => {
  const userId = req.session?.userId;
  if (!userId) {
    next();
    return;
  }

  let cachedUser: Awaited<ReturnType<typeof loadUserById>> | undefined;
  let forceRefresh = false;

  const ctx = {
    userId,
    invalidateAccessToken: () => {
      forceRefresh = true;
    },
    getAccessToken: async (): Promise<string> => {
      if (!cachedUser) {
        cachedUser = await loadUserById(userId);
        if (!cachedUser) {
          throw new Error("Signed-in user no longer exists.");
        }
      }
      const token = await getValidAccessToken(cachedUser, { forceRefresh });
      forceRefresh = false;
      return token;
    },
  };

  currentUserStore.run(ctx, () => next());
};
