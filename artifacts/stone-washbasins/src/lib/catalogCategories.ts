export const CATALOG_CATEGORIES = [
  {
    id: 'washbasins',
    label: 'Umývadlá',
    detail: 'Kamenné solitéry',
    terms: ['umyvad', 'washbasin', 'basin', 'sink'],
  },
  {
    id: 'dispensers',
    label: 'Dávkovače mydla',
    detail: 'Dávkovače mydla',
    terms: ['davkovac', 'dispenser', 'soap dispenser', 'soapdispenser'],
  },
  {
    id: 'toothbrush-cups',
    label: 'Poháre na zubné kefky',
    detail: 'Poháre na zubné kefky',
    terms: ['pohar', 'zubn', 'kefk', 'toothbrush'],
  },
  {
    id: 'soap-dishes',
    label: 'Mydelničky na mydlo',
    detail: 'Mydelničky na mydlo',
    terms: ['mydelnic', 'soap dish', 'soapdish'],
  },
  {
    id: 'faucets',
    label: 'Batérie',
    detail: 'Kúpeľňové batérie',
    terms: ['bateri', 'kohutik', 'vodovodna bateria', 'faucet', 'tap'],
  },
  {
    id: 'click-clack-valves',
    label: 'Ventily Click-Clack',
    detail: 'Výpuste do umývadla',
    terms: ['click-clack', 'click clack', 'clickclack', 'ventil', 'vypust', 'drain'],
  },
] as const;

export type CatalogCategoryId = (typeof CATALOG_CATEGORIES)[number]['id'];
