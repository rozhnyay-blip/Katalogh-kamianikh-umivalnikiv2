import { useState } from "react";
import {
  getAnalyticsConsent,
  setAnalyticsConsent,
  trackSitePageView,
} from "../lib/analytics";
import { translate, type Locale } from "../lib/localization";

export function AnalyticsConsent({ locale }: { locale: Locale }) {
  const [consent, setConsent] = useState<"accepted" | "rejected" | null>(
    () => getAnalyticsConsent(),
  );
  const [isOpen, setIsOpen] = useState(consent === null);

  const choose = (value: "accepted" | "rejected") => {
    setAnalyticsConsent(value);
    setConsent(value);
    setIsOpen(false);
    if (value === "accepted") trackSitePageView();
  };

  return (
    <div className="analytics-consent" aria-live="polite">
      {isOpen ? (
        <section className="analytics-consent-panel" aria-labelledby="analytics-consent-title">
          <div>
            <h2 id="analytics-consent-title">{translate(locale, "Voliteľná anonymná analytika")}</h2>
            <p>
              {translate(locale, "V prehľade SKALA po súhlase zaznamenáme návštevy a vybrané akcie pod náhodným ID relácie a prípadne ID produktu. Neukladáme IP adresu, meno, telefón ani e-mail. Voľbu môžete kedykoľvek zmeniť.")}
            </p>
          </div>
          <div className="analytics-consent-actions">
            <button type="button" className="button-quiet" onClick={() => choose("rejected")}>
              {translate(locale, "Odmietnuť")}
            </button>
            <button type="button" className="button-primary" onClick={() => choose("accepted")}>
              {translate(locale, "Povoliť analytiku")}
            </button>
          </div>
        </section>
      ) : (
        <button
          type="button"
          className="analytics-consent-settings"
          onClick={() => setIsOpen(true)}
          aria-label={translate(locale, "Zmeniť nastavenie analytiky")}
        >
          {translate(locale, "Nastavenie analytiky")}: {translate(locale, consent === "accepted" ? "povolená" : "odmietnutá")}
        </button>
      )}
    </div>
  );
}