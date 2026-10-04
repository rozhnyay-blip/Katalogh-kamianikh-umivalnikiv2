import { createAnalyticsEvent } from "@workspace/api-client-react";

type SiteEventName =
  | "page_view"
  | "favorite_add"
  | "favorite_remove"
  | "enquiry_started"
  | "enquiry_submitted"
  | "hero_whatsapp_click"
  | "contact_phone_click"
  | "contact_viber_click"
  | "contact_whatsapp_click"
  | "contact_instagram_click"
  | "catalog_load_more";

type EventData = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: {
      track(name: string, data?: EventData): void;
    };
  }
}

const CONSENT_KEY = "skala-analytics-consent";
const SESSION_KEY = "skala-analytics-session";
const PAGE_VIEW_KEY = "skala-analytics-page-view";

function analyticsIsAllowed(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

function getSessionId(): string | null {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
    const sessionId = window.crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, sessionId);
    return sessionId;
  } catch {
    return null;
  }
}

function recordEvent(eventName: SiteEventName, productId?: number): void {
  if (typeof window === "undefined" || !analyticsIsAllowed()) return;
  const sessionId = getSessionId();
  if (!sessionId) return;

  if (eventName !== "page_view") {
    try {
      window.umami?.track(
        eventName,
        productId === undefined ? undefined : { product_id: productId },
      );
    } catch {
      // Analytics must never interrupt a customer action.
    }
  }

  void createAnalyticsEvent({
    sessionId,
    eventName,
    ...(productId === undefined ? {} : { productId }),
  }).catch(() => {
    // A failed analytics request must never interrupt the site.
  });
}

export function trackSiteEvent(
  eventName: SiteEventName,
  productId?: number,
): void {
  recordEvent(eventName, productId);
}

export function trackSitePageView(): void {
  if (typeof window === "undefined" || !analyticsIsAllowed()) return;
  const pageKey = `${PAGE_VIEW_KEY}:${window.location.pathname}`;
  try {
    if (window.sessionStorage.getItem(pageKey)) return;
    window.sessionStorage.setItem(pageKey, "1");
  } catch {
    return;
  }
  recordEvent("page_view");
}

export function setAnalyticsConsent(consent: "accepted" | "rejected"): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, consent);
    if (consent === "rejected") {
      window.sessionStorage.removeItem(SESSION_KEY);
      for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
        const key = window.sessionStorage.key(index);
        if (key?.startsWith(PAGE_VIEW_KEY)) {
          window.sessionStorage.removeItem(key);
        }
      }
    }
  } catch {
    // If consent cannot be stored, analytics remains disabled.
  }
}

export function getAnalyticsConsent(): "accepted" | "rejected" | null {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === "accepted" || value === "rejected" ? value : null;
  } catch {
    return null;
  }
}