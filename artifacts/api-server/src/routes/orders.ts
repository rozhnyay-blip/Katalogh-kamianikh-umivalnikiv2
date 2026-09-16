import { CreateOrderResponse, ListOrdersResponse } from "@workspace/api-zod";
import { and, desc, eq } from "drizzle-orm";
import rateLimit from "express-rate-limit";
import { Router, type IRouter, type Request, type Response } from "express";

import { db, orders, products } from "@workspace/db";

import { requireOwner } from "../lib/auth";
import { API_ERRORS, logFailure, sendError } from "../lib/errors";
import { parseOrderInput } from "../lib/validation";

const router: IRouter = Router();

const orderLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: API_ERRORS.tooManyRequests },
});

router.post(
  "/orders",
  orderLimiter,
  async (req: Request, res: Response) => {
    const input = parseOrderInput(req.body);
    if (!input) {
      sendError(res, 400, API_ERRORS.invalidRequest);
      return;
    }

    try {
      const [product] = await db
        .select({
          id: products.id,
          name: products.name,
        })
        .from(products)
        .where(
          and(eq(products.id, input.productId), eq(products.available, true)),
        )
        .limit(1);
      if (!product) {
        sendError(res, 404, API_ERRORS.productUnavailable);
        return;
      }

      const [order] = await db
        .insert(orders)
        .values({
          productId: product.id,
          productName: product.name,
          name: input.name,
          phone: input.phone,
          email: input.email,
        })
        .returning({ id: orders.id });
      res.status(201).json(CreateOrderResponse.parse(order));
    } catch (error) {
      logFailure(req, "create_order", error);
      sendError(res, 500, API_ERRORS.internal);
    }
  },
);

router.get(
  "/orders",
  requireOwner,
  async (req: Request, res: Response) => {
    try {
      const rows = await db
        .select()
        .from(orders)
        .orderBy(desc(orders.createdAt));
      res.json(ListOrdersResponse.parse(rows));
    } catch (error) {
      logFailure(req, "list_orders", error);
      sendError(res, 500, API_ERRORS.internal);
    }
  },
);

export default router;