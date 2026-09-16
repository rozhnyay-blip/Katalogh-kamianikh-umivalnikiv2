import { z } from "zod/v4";

const text = (max: number) => z.string().trim().min(1).max(max);

const processStep = z.object({
  number: text(40),
  title: text(160),
  description: text(500),
});

const spec = z.object({
  label: text(160),
  value: text(240),
});

export const siteContentSchema = z.object({
  topline: z.object({
    tagline: text(160),
    note: text(160),
  }),
  nav: z.object({
    catalog: text(80),
    story: text(80),
    details: text(80),
    instagramUrl: z.string().url().max(500).refine((value) => value.startsWith("https://www.instagram.com/"), "Instagram URL required"),
  }),
  hero: z.object({
    eyebrow: text(120),
    titleLead: text(120),
    titleMiddle: text(120),
    titleEmphasis: text(120),
    lede: text(500),
    primaryCta: text(100),
    secondaryCta: text(100),
    visualAria: text(200),
    visualIndex: text(80),
    stampLine1: text(40),
    stampLine2: text(80),
    stampLine3: text(80),
  }),
  marquee: z.array(text(100)).min(1).max(8),
  story: z.object({
    eyebrow: text(120),
    titleLead: text(120),
    titleEmphasis: text(120),
    copy: text(900),
    note: text(400),
    steps: z.array(processStep).length(3),
  }),
  catalog: z.object({
    eyebrow: text(120),
    titleLead: text(120),
    titleEmphasis: text(120),
    intro: text(500),
    ownerToolbarTitle: text(160),
    ownerToolbarHelp: text(240),
    addProductLabel: text(100),
    emptyMessage: text(500),
    emptyAddLabel: text(180),
  }),
  details: z.object({
    eyebrow: text(160),
    titleLead: text(120),
    titleEmphasis: text(120),
    text: text(700),
    specs: z.array(spec).length(4),
  }),
  footer: z.object({
    description: text(400),
    navigationTitle: text(100),
    catalogLink: text(120),
    storyLink: text(120),
    detailsLink: text(160),
    socialTitle: text(100),
    socialHandle: text(120),
    bottomSlogan: text(240),
  }),
});

export type SiteContent = z.infer<typeof siteContentSchema>;

export const DEFAULT_SITE_CONTENT: SiteContent = {
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
  hero: {
    eyebrow: "Tvar · Kameň · Voda",
    titleLead: "Príroda",
    titleMiddle: "vo vašej",
    titleEmphasis: "kúpeľni.",
    lede: "Nachádzame kameň a dávame mu nový život — umývadlo, aké nebude mať nikto iný.",
    primaryCta: "Pozrieť kolekciu",
    secondaryCta: "Ako to vzniká",
    visualAria: "Skulpturálne umývadlo z prírodného kameňa",
    visualIndex: "01 — TVAR / VODA",
    stampLine1: "100%",
    stampLine2: "prírodný",
    stampLine3: "kameň",
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
    titleLead: "Nájdite svoj",
    titleEmphasis: "kameň.",
    intro: "Každé umývadlo je originál. To, čo vidíte, je presne to, čo dostanete.",
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
  return result.success ? result.data : null;
}