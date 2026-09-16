import { GetOwnerStatusResponse } from "@workspace/api-zod";
import { Router, type IRouter, type Request, type Response } from "express";

import { ownerStatus } from "../lib/auth";
import { logFailure, sendError, API_ERRORS } from "../lib/errors";

const router: IRouter = Router();

router.get("/owner/status", async (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    res.json(GetOwnerStatusResponse.parse(await ownerStatus(req)));
  } catch (error) {
    logFailure(req, "owner_status", error);
    // This endpoint must remain safe to call without auth configuration.
    sendError(res, 500, API_ERRORS.internal);
  }
});

export default router;