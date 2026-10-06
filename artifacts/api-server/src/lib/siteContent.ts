import { UpdateSiteContentBody } from "@workspace/api-zod";
import type { SiteContent } from "@workspace/api-zod";

export const siteContentSchema = UpdateSiteContentBody;

export const DEFAULT_SITE_CONTENT: SiteContent = {
  textOverrides: {},
  topline: {
    tagline: "Kameň, ktorý si pamätá vodu",
    note: "Prírodný kameň · Ručná práca",
  },
  nav: {
    catalog: "Katalóg",
    story: "Príbeh",
    details: "Detaily",
    instagramUrl: "https://www.instagram.com/skala_sk_/",
  },
  contact: {
    label: "Kontaktujte nás",
    phone: "0918103604",
    viberLabel: "Viber",
    whatsappLabel: "WhatsApp",
    instagramLabel: "Instagram",
  },
  hero: {
    eyebrow: "Tvar · Kameň · Voda",
    titleLead: "Luxusné",
    titleMiddle: "kamenné",
    titleEmphasis: "umývadlá.",
    lede: "Ručne opracované solitéry z prírodného kameňa pre výnimočné kúpeľne. Každý kus má vlastný tvar a kresbu.",
    primaryCta: "Pozrieť kolekciu",
    secondaryCta: "Ako to vzniká",
    visualAria: "Skulpturálne umývadlo z prírodného kameňa",
    visualIndex: "01 — TVAR / VODA",
    stampLine1: "100%",
    stampLine2: "prírodný",
    stampLine3: "kameň",
    price: "300 €",
    dimensions: "56 × 32 × 13 cm",
    weight: "40 kg",
    orderCta: "Objednať",
  },
  marquee: ["ručná práca", "prírodný kameň", "jediný exemplár", "pokojné rána"],
  story: {
    eyebrow: "01 / náš prístup",
    titleLead: "Nie ideálny.",
    titleEmphasis: "Skutočný.",
    copy: "V SKALA neopravujeme prírodu. Odhaľujeme ju — brúsime líniu, zachovávame žilky, ponechávame haptickosť. Každý tvar sa rodí z konkrétneho kameňa, nie naopak.",
    note: "Kameň spracúvame ručne s dôrazom na detail a rešpektom k materiálu.",
    steps: [
      { number: "01 — Nájsť", title: "Dopriať kameňu čas", description: "Vyberáme kusy s prirodzenou plasticitou a hustou štruktúrou." },
      { number: "02 — Precítiť", title: "Uvidieť tvar", description: "Najskôr počúvame faktúru. Potom opatrne odhaľujeme misu bez zmazania charakteru." },
      { number: "03 — Odovzdať", title: "Poslať ďalej", description: "Kameň ošetríme, otestujeme s vodou a bezpečne zabalíme na cestu k vám." },
    ],
  },
  catalog: {
    eyebrow: "02 / hotové tvary",
    titleLead: "Vyberte si svoje",
    titleEmphasis: "umývadlo.",
    intro: "Každé umývadlo SKALA je ručne opracovaný originál z prírodného kameňa. Objavte solitéry pre výnimočné kúpeľne.",
    ownerToolbarTitle: "Vaše fotografie, priamo v katalógu",
    ownerToolbarHelp: "Podržte prst na fotografii alebo klepnite na Pridať fotografiu.",
    addProductLabel: "Pridať umývadlo",
    emptyMessage: "Zatiaľ tu nie sú žiadne umývadlá. Sledujte náš Instagram pre novinky.",
    emptyAddLabel: "Pridať prvé umývadlo a fotografie",
  },
  details: {
    eyebrow: "03 / detaily, na ktorých záleží",
    titleLead: "Kameň si pýta",
    titleEmphasis: "pozornosť.",
    text: "Pri výbere si pozrite fotografie, materiál a rozmery konkrétneho umývadla. Na podrobnosti o montáži, údržbe a doručení sa môžete opýtať v dopyte alebo na Instagrame.",
    specs: [
      { label: "Materiál a rozmery", value: "Pri konkrétnom výrobku" },
      { label: "Fotografie", value: "Detail každého kusu" },
      { label: "Príslušenstvo a montáž", value: "Informácie na vyžiadanie" },
      { label: "Dodanie", value: "Podľa dohody" },
    ],
  },
  footer: {
    description: "Umývadlá z prírodného kameňa. Tvar pre vaše každodenné rituály.",
    navigationTitle: "Navigácia",
    catalogLink: "Katalóg výrobkov",
    storyLink: "O nás",
    detailsLink: "Starostlivosť o kameň",
    socialTitle: "Sledujte nás",
    socialHandle: "@skala_sk_",
    bottomSlogan: "Kameň sa neopakuje. A to je dobre.",
  },
};

export function parseSiteContent(input: unknown): SiteContent | null {
  const result = siteContentSchema.safeParse(input);
  if (!result.success) return null;
  const entries = Object.entries(result.data.textOverrides);
  if (entries.length > 400 || entries.some(([key]) =>
    key.length > 1200 || key === "__proto__" || key === "constructor" || key === "prototype"
  )) return null;
  return result.data;
}

export function parseStoredSiteContent(input: unknown): SiteContent | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const stored = input as Record<string, unknown>;
  const storedHero = stored.hero && typeof stored.hero === "object" && !Array.isArray(stored.hero)
    ? stored.hero as Record<string, unknown>
    : {};
  return parseSiteContent({
    ...stored,
    hero: { ...DEFAULT_SITE_CONTENT.hero, ...storedHero },
    textOverrides: stored.textOverrides ?? {},
  });
}