import { clerkClient, getAuth } from "@clerk/express";
import type { Request, RequestHandler } from "express";

import { API_ERRORS, sendError } from "./errors";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ClerkEmailAddressLike {
  emailAddress: string;
  verification?: {
    status?: string | null;
  } | null;
}

function normalizeOwnerEmail(value: string | undefined): string | null {
  const configured = value?.trim().toLowerCase();
  if (!configured || !EMAIL_PATTERN.test(configured)) {
    return null;
  }
  return configured;
}

/**
 * Pure owner predicate used after the Clerk backend has resolved a user.
 * Keeping the comparison independent from environment access makes it
 * straightforward to test without secrets or a Clerk account.
 */
export function hasVerifiedOwnerEmail(
  configuredEmail: string | undefined,
  emailAddresses: readonly ClerkEmailAddressLike[],
): boolean {
  const ownerEmail = normalizeOwnerEmail(configuredEmail);
  if (!ownerEmail) {
    return false;
  }
  return emailAddresses.some(
    (emailAddress) =>
      emailAddress.verification?.status === "verified" &&
      emailAddress.emailAddress.trim().toLowerCase() === ownerEmail,
  );
}

/**
 * This is deliberately the only identity source used by the backend. The
 * Clerk middleware verifies the session, and the resulting user id is then
 * resolved through Clerk's backend API before an ownership decision is made.
 */
export function authenticatedUserId(req: Request): string | null {
  try {
    const userId = getAuth(req).userId;
    return typeof userId === "string" && userId.length > 0 ? userId : null;
  } catch {
    return null;
  }
}

export async function isConfiguredOwner(userId: string): Promise<boolean> {
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!normalizeOwnerEmail(ownerEmail)) {
    return false;
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    return hasVerifiedOwnerEmail(ownerEmail, user.emailAddresses);
  } catch {
    // The caller gets a generic authorization result. Details must not leave
    // this process because Clerk errors can contain account information.
    return false;
  }
}

export async function ownerStatus(req: Request): Promise<{
  signedIn: boolean;
  isOwner: boolean;
}> {
  const userId = authenticatedUserId(req);
  if (!userId) {
    return { signedIn: false, isOwner: false };
  }

  return {
    signedIn: true,
    isOwner: await isConfiguredOwner(userId),
  };
}

/**
 * Protects mutations and private owner resources. Missing OWNER_EMAIL,
 * missing Clerk configuration, and Clerk API failures all fail closed.
 */
export const requireOwner: RequestHandler = async (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  const userId = authenticatedUserId(req);
  if (!userId) {
    sendError(res, 401, API_ERRORS.authenticationRequired);
    return;
  }

  if (!(await isConfiguredOwner(userId))) {
    sendError(res, 403, API_ERRORS.ownerRequired);
    return;
  }

  res.locals.ownerClerkId = userId;
  next();
};

export function ownerIdFromResponseLocals(res: {
  locals: Record<string, unknown>;
}): string {
  return String(res.locals.ownerClerkId);
}