import { db, products } from "@workspace/db";
import {
  AppendProductPhotosResponse,
  CreateProductResponse,
  ListProductsResponse,
  UpdateProductResponse,
} from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";

import { requireOwner, ownerIdFromResponseLocals } from "../lib/auth";
import { API_ERRORS, logFailure, sendError } from "../lib/errors";
import {
  ImageAssetValidationError,
  validateOwnedProductImages,
} from "../lib/imageAssets";
import {
  parsePositiveIntegerParam,
  mergeProductImages,
  parseProductInput,
  parseProductPhotosInput,
  parseProductUpdate,
} from "../lib/validation";

const router: IRouter = Router();

class ProductPhotosLimitError extends Error {
  constructor() {
    super("Product photo limit exceeded");
    this.name = "ProductPhotosLimitError";
  }
}

router.get("/products", async (req: Request, res: Response) => {
  try {
    const rows = await db.select().from(products).orderBy(products.id);
    res.json(ListProductsResponse.parse(rows));
  } catch (error) {
    logFailure(req, "list_products", error);
    sendError(res, 500, API_ERRORS.internal);
  }
});

router.post(
  "/products",
  requireOwner,
  async (req: Request, res: Response) => {
    const input = parseProductInput(req.body);
    if (!input) {
      sendError(res, 400, API_ERRORS.invalidRequest);
      return;
    }

    const ownerClerkId = ownerIdFromResponseLocals(res);
    try {
      await validateOwnedProductImages(input.images, ownerClerkId);
      const [product] = await db
        .insert(products)
        .values(input)
        .returning();
      res.status(201).json(CreateProductResponse.parse(product));
    } catch (error) {
      if (error instanceof ImageAssetValidationError) {
        sendError(res, 400, API_ERRORS.invalidRequest);
        return;
      }
      logFailure(req, "create_product", error);
      sendError(res, 500, API_ERRORS.internal);
    }
  },
);

router.patch(
  "/products/:id",
  requireOwner,
  async (req: Request, res: Response) => {
    const id = parsePositiveIntegerParam(req.params.id);
    const update = parseProductUpdate(req.body);
    if (!id || !update) {
      sendError(res, 400, API_ERRORS.invalidRequest);
      return;
    }

    const ownerClerkId = ownerIdFromResponseLocals(res);
    try {
      if (update.images) {
        await validateOwnedProductImages(update.images, ownerClerkId);
      }

      const { hasChanges: _hasChanges, ...values } = update;
      const [product] = await db
        .update(products)
        .set(values)
        .where(eq(products.id, id))
        .returning();
      if (!product) {
        sendError(res, 404, API_ERRORS.productNotFound);
        return;
      }
      res.json(UpdateProductResponse.parse(product));
    } catch (error) {
      if (error instanceof ImageAssetValidationError) {
        sendError(res, 400, API_ERRORS.invalidRequest);
        return;
      }
      logFailure(req, "update_product", error);
      sendError(res, 500, API_ERRORS.internal);
    }
  },
);

router.post(
  "/products/:id/photos",
  requireOwner,
  async (req: Request, res: Response) => {
    const id = parsePositiveIntegerParam(req.params.id);
    const input = parseProductPhotosInput(req.body);
    if (!id || !input) {
      sendError(res, 400, API_ERRORS.invalidRequest);
      return;
    }

    const ownerClerkId = ownerIdFromResponseLocals(res);
    try {
      // Validate ownership, metadata, magic bytes, and generation before the
      // append transaction just like the existing product write paths.
      await validateOwnedProductImages(input.images, ownerClerkId);

      const product = await db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(products)
          .where(eq(products.id, id))
          .for("update");
        if (!current) {
          return null;
        }

        const mergedImages = mergeProductImages(current.images, input.images);
        if (!mergedImages) {
          throw new ProductPhotosLimitError();
        }

        // A retry after a lost response is idempotent: identical paths leave
        // the row untouched while still returning the complete product.
        if (mergedImages.length === current.images.length) {
          return current;
        }

        const [updated] = await tx
          .update(products)
          .set({ images: mergedImages })
          .where(eq(products.id, id))
          .returning();
        return updated ?? current;
      });

      if (!product) {
        sendError(res, 404, API_ERRORS.productNotFound);
        return;
      }
      res.status(200).json(AppendProductPhotosResponse.parse(product));
    } catch (error) {
      if (error instanceof ImageAssetValidationError) {
        sendError(res, 400, API_ERRORS.invalidRequest);
        return;
      }
      if (error instanceof ProductPhotosLimitError) {
        sendError(res, 409, API_ERRORS.productPhotosLimit);
        return;
      }
      logFailure(req, "append_product_photos", error);
      sendError(res, 500, API_ERRORS.internal);
    }
  },
);

router.delete(
  "/products/:id",
  requireOwner,
  async (req: Request, res: Response) => {
    const id = parsePositiveIntegerParam(req.params.id);
    if (!id) {
      sendError(res, 400, API_ERRORS.invalidRequest);
      return;
    }

    try {
      const deleted = await db
        .delete(products)
        .where(eq(products.id, id))
        .returning({ id: products.id });
      if (deleted.length === 0) {
        sendError(res, 404, API_ERRORS.productNotFound);
        return;
      }
      res.status(204).send();
    } catch (error) {
      logFailure(req, "delete_product", error);
      sendError(res, 500, API_ERRORS.internal);
    }
  },
);

export default router;