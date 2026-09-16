import type { RequestHandler } from "express";

import { API_ERRORS, sendError } from "../lib/errors";

function firstForwarded(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.split(",")[0]?.trim() || null;
}

function requestOrigin(req: Parameters<RequestHandler>[0]): string | null {
  const protocol =
    firstForwarded(req.headers["x-forwarded-proto"]) || req.protocol;
  const host =
    firstForwarded(req.headers["x-forwarded-host"]) || req.get("host");
  if (!protocol || !host) {
    return null;
  }
  return `${protocol.toLowerCase()}://${host.toLowerCase()}`;
}

/**
 * Clerk's browser session is cookie based. JSON endpoints are therefore
 * protected against cross-site state-changing requests by checking Origin
 * (and Fetch Metadata where available) before handlers run.
 */
export const sameOriginUnsafeRequests: RequestHandler = (req, res, next) => {
  if (
    req.method === "GET" ||
    req.method === "HEAD" ||
    req.method === "OPTIONS"
  ) {
    next();
    return;
  }

  const fetchSite = req.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    sendError(res, 403, API_ERRORS.forbiddenOrigin);
    return;
  }

  const originHeader = req.get("origin");
  if (!originHeader) {
    // A browser carrying cookies must identify its origin. Non-browser
    // callers without cookies (including Clerk mobile token clients) do not
    // need this browser CSRF check.
    if (req.headers.cookie) {
      sendError(res, 403, API_ERRORS.forbiddenOrigin);
      return;
    }
    next();
    return;
  }

  if (originHeader === "null") {
    sendError(res, 403, API_ERRORS.forbiddenOrigin);
    return;
  }

  let origin: string;
  try {
    origin = new URL(originHeader).origin.toLowerCase();
  } catch {
    sendError(res, 403, API_ERRORS.forbiddenOrigin);
    return;
  }

  if (origin !== requestOrigin(req)) {
    sendError(res, 403, API_ERRORS.forbiddenOrigin);
    return;
  }

  next();
};