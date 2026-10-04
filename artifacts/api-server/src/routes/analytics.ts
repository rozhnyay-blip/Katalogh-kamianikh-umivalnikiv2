import { clerkClient } from "@clerk/express";
import {
  CreateAnalyticsEventBody,
  CreateAnalyticsEventResponse,
  GetOwnerAnalyticsResponse,
} from "@workspace/api-zod";
import {
  analyticsEvents,
  db,
  orders,
} from "@workspace/db";
import {
  and,
  count,
  countDistinct,
  eq,
  gte,
  lt,
  ne,
  sql,
} from "drizzle-orm";
import rateLimit from "express-rate-limit";
import { Router, type IRouter, type Request, type Response } from "express";

import { requireOwner } from "../lib/auth";
import { API_ERRORS, logFailure, sendError } from "../lib/errors";

const router: IRouter = Router();
const PERIOD_DAYS = 30;
const RETENTION_DAYS = 90;
const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;
let lastCleanupAt = 0;

const analyticsEventLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: API_ERRORS.tooManyRequests },
});

router.post(
  "/analytics/events",
  analyticsEventLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = CreateAnalyticsEventBody.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, API_ERRORS.invalidRequest);
      return;
    }

    try {
      await db.insert(analyticsEvents).values({
        sessionId: parsed.data.sessionId,
        eventName: parsed.data.eventName,
        productId: parsed.data.productId ?? null,
      });

      if (Date.now() - lastCleanupAt >= CLEANUP_INTERVAL_MS) {
        lastCleanupAt = Date.now();
        try {
          const retentionCutoff = new Date(
            Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000,
          );
          await db
            .delete(analyticsEvents)
            .where(lt(analyticsEvents.createdAt, retentionCutoff));
        } catch (error) {
          logFailure(req, "prune_analytics_events", error);
        }
      }

      res
        .status(202)
        .json(CreateAnalyticsEventResponse.parse({ accepted: true }));
    } catch (error) {
      logFailure(req, "create_analytics_event", error);
      sendError(res, 500, API_ERRORS.internal);
    }
  },
);

router.get(
  "/owner/analytics",
  requireOwner,
  async (req: Request, res: Response): Promise<void> => {
    res.setHeader("Cache-Control", "no-store");

    const now = new Date();
    const todayUtc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const start = new Date(todayUtc);
    start.setUTCDate(start.getUTCDate() - (PERIOD_DAYS - 1));
    const endExclusive = new Date(todayUtc);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

    const dateGroup = sql<string>`to_char(${analyticsEvents.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`;

    try {
      const [
        visitTotals,
        interactionTotals,
        enquiryTotals,
        registrationCount,
        daily,
        events,
      ] = await Promise.all([
        db
          .select({
            visits: count(),
            uniqueSessions: countDistinct(analyticsEvents.sessionId),
          })
          .from(analyticsEvents)
          .where(
            and(
              gte(analyticsEvents.createdAt, start),
              lt(analyticsEvents.createdAt, endExclusive),
              eq(analyticsEvents.eventName, "page_view"),
            ),
          ),
        db
          .select({ interactions: count() })
          .from(analyticsEvents)
          .where(
            and(
              gte(analyticsEvents.createdAt, start),
              lt(analyticsEvents.createdAt, endExclusive),
              ne(analyticsEvents.eventName, "page_view"),
            ),
          ),
        db
          .select({ enquiries: count() })
          .from(orders)
          .where(
            and(gte(orders.createdAt, start), lt(orders.createdAt, endExclusive)),
          ),
        clerkClient.users.getCount(),
        db
          .select({
            date: dateGroup,
            visits: count(),
            uniqueSessions: countDistinct(analyticsEvents.sessionId),
          })
          .from(analyticsEvents)
          .where(
            and(
              gte(analyticsEvents.createdAt, start),
              lt(analyticsEvents.createdAt, endExclusive),
              eq(analyticsEvents.eventName, "page_view"),
            ),
          )
          .groupBy(dateGroup)
          .orderBy(dateGroup),
        db
          .select({
            eventName: analyticsEvents.eventName,
            count: count(),
          })
          .from(analyticsEvents)
          .where(
            and(
              gte(analyticsEvents.createdAt, start),
              lt(analyticsEvents.createdAt, endExclusive),
              ne(analyticsEvents.eventName, "page_view"),
            ),
          )
          .groupBy(analyticsEvents.eventName)
          .orderBy(sql`count(*) desc`),
      ]);

      const analytics = {
        periodDays: PERIOD_DAYS,
        startDate: start.toISOString().slice(0, 10),
        endDate: todayUtc.toISOString().slice(0, 10),
        visits: visitTotals[0]?.visits ?? 0,
        uniqueSessions: visitTotals[0]?.uniqueSessions ?? 0,
        interactions: interactionTotals[0]?.interactions ?? 0,
        enquiries: enquiryTotals[0]?.enquiries ?? 0,
        registeredAccounts: registrationCount,
        daily,
        events,
      };
      res.json(GetOwnerAnalyticsResponse.parse(analytics));
    } catch (error) {
      logFailure(req, "get_owner_analytics", error);
      sendError(res, 500, API_ERRORS.internal);
    }
  },
);

export default router;