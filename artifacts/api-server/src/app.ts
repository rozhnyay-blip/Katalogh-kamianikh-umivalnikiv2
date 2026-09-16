import express, { type Express } from "express";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import { sameOriginUnsafeRequests } from "./middlewares/csrf";
import { API_ERRORS, logFailure } from "./lib/errors";

const app: Express = express();
// The service is reached through the shared reverse proxy, not directly.
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

// The Clerk proxy streams raw bytes and must be mounted before body parsers.
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// Browser APIs are same-origin. Never reflect arbitrary origins with cookies:
// the owner inbox contains private customer contact details.
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: true, limit: "64kb" }));

// Resolve the publishable key from the incoming request host so the same
// server can serve multiple Clerk custom domains. Falls back to
// CLERK_PUBLISHABLE_KEY when the host doesn't map to a custom domain.
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use(sameOriginUnsafeRequests);

app.use("/api", router);
app.use("/api", (_req, res) => {
  res.status(404).json({ error: API_ERRORS.notFound });
});

app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  logFailure(req, "unhandled_request", err);
  res.status(500).json({ error: API_ERRORS.internal });
});

export default app;
