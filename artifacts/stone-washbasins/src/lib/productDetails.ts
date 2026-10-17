export type ProductDetailsFields = {
  material: string;
  dimensions: string;
  weight: string;
  additionalDetails: string;
};

export function createEmptyProductDetails(): ProductDetailsFields {
  return {
    material: '',
    dimensions: '',
    weight: '',
    additionalDetails: '',
  };
}

export function formatProductDetailLines(subtitle: string): string[] {
  return subtitle
    .replace(/\s+(?=(?:Vonkajšie|Vonkajsie|Vnútorné|Vnutorne|Hmotnosť|Hmotnost|Rozmery|Material|Materiál|Strana|Priemer|Výška|Vyska|Šírka|Sirka|Hĺbka|Hlbka)(?::|：|\s|$))/giu, '\n')
    .split(/\n+|\s*[·•|]\s*/u)
    .map((line) => line.trim())
    .filter((line) => Boolean(line) && !/^(?:Skladom|Na sklade|Skladem|Dostupné|Dostupne|Predané|Predane|Sold|In stock|Na objednávku|Made to order|У наявності|Під замовлення)(?:$|[\s·•|]|[^\p{L}\p{N}])/iu.test(line));
}

function appendDetail(current: string, next: string): string {
  const value = next.trim();
  return value ? (current ? `${current} · ${value}` : value) : current;
}

export function parseProductDetails(subtitle: string): ProductDetailsFields {
  const fields = createEmptyProductDetails();
  const additional: string[] = [];

  for (const line of formatProductDetailLines(subtitle)) {
    const material = line.match(/^(?:Materiál|Material)\s*(?:[:：]\s*|\s+)(.+)$/iu);
    if (material) {
      fields.material = appendDetail(fields.material, material[1]);
      continue;
    }

    const weight = line.match(/^(?:Hmotnosť|Hmotnost|Váha|Vaha|Weight)\s*(?:[:：]\s*|\s+)(.+)$/iu);
    if (weight) {
      fields.weight = appendDetail(fields.weight, weight[1]);
      continue;
    }

    const dimensions = line.match(/^(?:Rozmery|Rozměry|Dimensions)\s*(?:[:：]\s*|\s+)(.+)$/iu);
    if (dimensions) {
      fields.dimensions = appendDetail(fields.dimensions, dimensions[1]);
      continue;
    }

    if (/^(?:Strana|Vnútorné|Vnutorne|Vonkajšie|Vonkajsie|Priemer|Výška|Vyska|Šírka|Sirka|Hĺbka|Hlbka)(?:\s*[:：]|\s|$)/iu.test(line)) {
      fields.dimensions = appendDetail(fields.dimensions, line);
      continue;
    }

    if (/^(?:Skladom|Na sklade|Dostupné|Dostupne|Predané|Predane|Sold)\b/iu.test(line)) {
      additional.push(line);
      continue;
    }

    if (/(?:\d+(?:[.,]\d+)?\s*(?:kg|g)\b)/iu.test(line)) {
      fields.weight = appendDetail(fields.weight, line);
      continue;
    }

    if (/(?:\d\s*(?:×|x|\*|\/)\s*\d|\b\d+(?:[.,]\d+)?\s*(?:cm|mm)\b)/iu.test(line)) {
      fields.dimensions = appendDetail(fields.dimensions, line);
      continue;
    }

    if (!fields.material && !/\d/u.test(line)) {
      fields.material = line;
      continue;
    }

    additional.push(line);
  }

  fields.additionalDetails = additional.join(' · ');
  return fields;
}

export function composeProductSubtitle(fields: ProductDetailsFields): string {
  return [
    fields.material.trim() ? `Materiál: ${fields.material.trim()}` : '',
    fields.dimensions.trim() ? `Rozmery: ${fields.dimensions.trim()}` : '',
    fields.weight.trim() ? `Hmotnosť: ${fields.weight.trim()}` : '',
    fields.additionalDetails.trim(),
  ].filter(Boolean).join(' · ');
}
