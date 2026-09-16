import { db, siteContent as siteContentTable } from "@workspace/db";
import { SiteContentResponse } from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";

import { requireOwner } from "../lib/auth";
import { API_ERRORS, logFailure, sendError } from "../lib/errors";
import { DEFAULT_SITE_CONTENT, parseSiteContent } from "../lib/siteContent";

const router: IRouter = Router();

router.get("/site-content", async (req: Request, res: Response) => {
  try {
    const [row] = await db
      .select({ content: siteContentTable.content })
      .from(siteContentTable)
      .where(eq(siteContentTable.id, 1))
      .limit(1);
    const content = parseSiteContent(row?.content) ?? DEFAULT_SITE_CONTENT;
    res.json(SiteContentResponse.parse(content));
  } catch (error) {
    logFailure(req, "get_site_content", error);
    sendError(res, 500, API_ERRORS.internal);
  }
});

router.put("/site-content", requireOwner, async (req: Request, res: Response) => {
  const content = parseSiteContent(req.body);
  if (!content) {
    sendError(res, 400, API_ERRORS.invalidRequest);
    return;
  }

  try {
    const [row] = await db
      .insert(siteContentTable)
      .values({ id: 1, content })
      .onConflictDoUpdate({
        target: siteContentTable.id,
        set: { content, updatedAt: new Date() },
      })
      .returning({ content: siteContentTable.content });
    res.json(SiteContentResponse.parse(parseSiteContent(row.content) ?? DEFAULT_SITE_CONTENT));
  } catch (error) {
    logFailure(req, "update_site_content", error);
    sendError(res, 500, API_ERRORS.internal);
  }
});

export default router;