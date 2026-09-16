import { RequestUploadUrlResponse } from "@workspace/api-zod";
import { db, uploads } from "@workspace/db";
import rateLimit from "express-rate-limit";
import { Router, type IRouter, type Request, type Response } from "express";

import {
  authenticatedUserId,
  isConfiguredOwner,
  ownerIdFromResponseLocals,
  requireOwner,
} from "../lib/auth";
import { API_ERRORS, logFailure, sendError } from "../lib/errors";
import {
  getUploadAsset,
  getValidatedImageForServing,
  isReferencedByProduct,
  objectStorageService,
  validateOwnedProductImages,
  ImageAssetValidationError,
} from "../lib/imageAssets";
import {
  getOrCreateImageVariant,
  parseImageVariantWidth,
  VariantOverloadedError,
} from "../lib/imageVariants";
import { safeGenerationNumber } from "../lib/imageValidation";
import { parseUploadRequest, validateImagePath } from "../lib/validation";

const router: IRouter = Router();

const uploadLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  keyGenerator: (_req, res) => ownerIdFromResponseLocals(res),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: API_ERRORS.tooManyRequests },
});

router.post(
  "/storage/uploads/request-url",
  requireOwner,
  uploadLimiter,
  async (req: Request, res: Response) => {
    const input = parseUploadRequest(req.body);
    if (!input) {
      sendError(res, 400, API_ERRORS.invalidRequest);
      return;
    }

    const ownerClerkId = ownerIdFromResponseLocals(res);
    try {
      // The file itself is uploaded directly to this short-lived URL. It is
      // never accepted as a request body by this API.
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      if (!validateImagePath(objectPath)) {
        sendError(res, 500, API_ERRORS.internal);
        return;
      }

      await db.insert(uploads).values({
        objectPath,
        ownerClerkId,
        declaredName: input.name,
        declaredSize: input.size,
        declaredContentType: input.contentType,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      res.json(
        RequestUploadUrlResponse.parse({
          uploadURL,
          objectPath,
          metadata: input,
        }),
      );
    } catch (error) {
      logFailure(req, "request_upload_url", error);
      sendError(res, 500, API_ERRORS.internal);
    }
  },
);

router.get(
  "/storage/objects/*path",
  async (req: Request, res: Response) => {
    const requestedWidth = parseImageVariantWidth(req.query["width"]);
    if (requestedWidth === null) {
      sendError(res, 400, API_ERRORS.invalidImageWidth);
      return;
    }

    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath || ""}`;
    if (!validateImagePath(objectPath)) {
      sendError(res, 404, API_ERRORS.uploadNotFound);
      return;
    }

    try {
      const referenced = await isReferencedByProduct(objectPath);
      const asset = await getUploadAsset(objectPath);
      if (!asset) {
        sendError(res, 404, API_ERRORS.uploadNotFound);
        return;
      }

      if (!referenced) {
        const userId = authenticatedUserId(req);
        if (
          !userId ||
          userId !== asset.ownerClerkId ||
          !(await isConfiguredOwner(userId))
        ) {
          // Do not disclose whether an unreferenced private object exists.
          sendError(res, 404, API_ERRORS.uploadNotFound);
          return;
        }
        // A pending object must pass the same checks before an owner can
        // preview it. This also records its generation for later serving.
        await validateOwnedProductImages([objectPath], userId);
      }

      const { file, verified } =
        await getValidatedImageForServing(objectPath);
      const pinnedFile = file.bucket.file(file.name, {
        generation: safeGenerationNumber(verified.generation),
      });

      if (requestedWidth !== undefined) {
        let variant: Buffer;
        try {
          variant = await getOrCreateImageVariant({
            objectPath,
            verifiedGeneration: verified.generation,
            width: requestedWidth,
            readPinnedSource: async () => {
              const [source] = await pinnedFile.download({
                validation: false,
              });
              if (source.length !== verified.size) {
                throw new Error("Pinned image size changed");
              }
              return source;
            },
          });
        } catch (error) {
          if (error instanceof VariantOverloadedError) {
            sendError(res, 503, API_ERRORS.imageVariantOverloaded);
            return;
          }
          logFailure(req, "serve_storage_variant", error);
          sendError(res, 500, API_ERRORS.imageVariantUnavailable);
          return;
        }

        res.status(200);
        res.setHeader("Content-Type", "image/webp");
        res.setHeader("Content-Length", String(variant.length));
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader(
          "Cache-Control",
          referenced
            ? "public, max-age=3600, immutable"
            : "private, no-store",
        );
        res.end(variant);
        return;
      }

      res.status(200);
      res.setHeader("Content-Type", verified.contentType);
      res.setHeader("Content-Length", String(verified.size));
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader(
        "Cache-Control",
        referenced
          ? "public, max-age=3600, immutable"
          : "private, no-store",
      );

      const stream = pinnedFile.createReadStream({ validation: false });
      stream.once("error", () => {
        if (res.headersSent) {
          res.destroy();
        } else {
          sendError(res, 404, API_ERRORS.uploadNotFound);
        }
      });
      stream.pipe(res);
    } catch (error) {
      if (error instanceof ImageAssetValidationError) {
        sendError(res, 404, API_ERRORS.uploadNotFound);
        return;
      }
      logFailure(req, "serve_storage_object", error);
      sendError(res, 500, API_ERRORS.internal);
    }
  },
);

export default router;