import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pinoHttp from "pino-http";
import { pool } from "@workspace/db";
import router from "./routes";
import { stripeWebhookHandler } from "./routes/checkout";
import { logger } from "./lib/logger";
import { currentUserMiddleware } from "./middlewares/currentUser";

const app: Express = express();

const PgSessionStore = connectPgSimple(session);

const sessionSecret =
  process.env["SESSION_SECRET"] ||
  process.env["GOOGLE_OAUTH_CLIENT_SECRET"];

if (!sessionSecret) {
  if (process.env["NODE_ENV"] === "production") {
    throw new Error(
      "SESSION_SECRET must be set in production to sign session cookies.",
    );
  }
  logger.warn(
    "SESSION_SECRET is not set; sessions will be signed with an unstable per-process secret. Set SESSION_SECRET to make logins persist across restarts.",
  );
}

app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());

app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler,
);

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.use(
  session({
    store: new PgSessionStore({
      pool,
      tableName: "user_sessions",
      createTableIfMissing: true,
    }),
    name: "fileray.sid",
    secret: sessionSecret || `dev-${Math.random().toString(36).slice(2)}`,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env["NODE_ENV"] === "production",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  }),
);

app.use(currentUserMiddleware);

app.use("/api", router);

export default app;
