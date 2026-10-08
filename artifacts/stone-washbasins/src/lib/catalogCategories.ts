export const CATALOG_CATEGORIES = [
  {
    id: 'washbasins',
    label: 'Umývadlá',
    detail: 'Kamenné solitéry',
    terms: ['umyvad', 'washbasin', 'basin', 'sink'],
  },
  {
    id: 'faucets',
    label: 'Batérie',
    detail: 'Kúpeľňové batérie',
    terms: ['bateri', 'kohutik', 'vodovodna bateria', 'faucet', 'tap'],
  },
  {
    id: 'dispensers',
    label: 'Dávkovače mydla',
    detail: 'Doplnky k umývadlu',
    terms: ['davkovac', 'dispenser', 'soap', 'mydl'],
  },
  {
    id: 'accessories',
    label: 'Doplnky',
    detail: 'Mlynčeky a poháre na zubné kefky',
    terms: ['doplnk', 'mlyncek', 'pohar', 'zubn', 'kefk', 'toothbrush'],
  },
] as const;

export type CatalogCategoryId = (typeof CATALOG_CATEGORIES)[number]['id'];
