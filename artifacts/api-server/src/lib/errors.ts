import type { Request, Response } from "express";

export const API_ERRORS = {
  authenticationRequired: "Vyžaduje sa prihlásenie.",
  ownerRequired: "Prístup je povolený iba vlastníkovi.",
  invalidRequest: "Neplatné údaje.",
  notFound: "Záznam sa nenašiel.",
  productNotFound: "Produkt sa nenašiel.",
  productUnavailable: "Produkt nie je dostupný.",
  uploadNotFound: "Súbor sa nenašiel.",
  forbiddenOrigin: "Neplatná požiadavka z iného pôvodu.",
  tooManyRequests: "Príliš veľa požiadaviek.",
  internal: "Nastala interná chyba.",
} as const;

export function sendError(
  res: Response,
  status: number,
  error: string,
): void {
  res.status(status).json({ error });
}

/**
 * Keep operational logs useful without putting request bodies, cookies,
 * authorization data, object URLs, or user PII into the log stream.
 */
export function logFailure(
  req: Request,
  operation: string,
  error: unknown,
): void {
  req.log.error(
    {
      operation,
      errorType: error instanceof Error ? error.name : "UnknownError",
    },
    "Backend operation failed",
  );
}