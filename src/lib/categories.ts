// Categorieën voor banktransacties. Regels zoeken een stukje tekst in de omschrijving
// (hoofdletterongevoelig). Eigen regels (in de database) gaan vóór deze standaardregels.
// VOORLOPIG: aan te scherpen zodra er een echte ABN AMRO-export is.

export interface CategoryRule {
  id?: number;
  match: string;
  category: string;
}

export const CATEGORIES = [
  'Boodschappen',
  'Uit eten & bezorgen',
  'Vervoer',
  'Wonen & energie',
  'Abonnementen',
  'Zorg',
  'Kleding & winkels',
  'Uitgaan & vrije tijd',
  'Sport',
  'Roken',
  'Sparen & beleggen',
  'Inkomen',
  'Overboekingen',
  'Overig',
] as const;

export const DEFAULT_RULES: CategoryRule[] = [
  ...['albert heijn', 'ah to go', 'jumbo', 'lidl', 'aldi', 'plus ', 'dirk', 'coop', 'spar', 'vomar', 'picnic', 'ekoplaza', 'hoogvliet'].map((m) => ({ match: m, category: 'Boodschappen' })),
  ...['thuisbezorgd', 'uber eats', 'deliveroo', 'mcdonald', 'burger king', 'kfc', 'subway', 'dominos', 'new york pizza', 'starbucks', 'restaurant', 'cafe', 'café', 'eetcafe'].map((m) => ({ match: m, category: 'Uit eten & bezorgen' })),
  ...['ns groep', 'ns reizigers', 'ov-chipkaart', 'translink', 'arriva', 'connexxion', 'ret ', 'gvb', 'htm', 'shell', 'bp ', 'esso', 'tango', 'tinq', 'total', 'q-park', 'parkeren', 'swapfiets', 'uber', 'bolt'].map((m) => ({ match: m, category: 'Vervoer' })),
  ...['huur', 'eneco', 'vattenfall', 'essent', 'greenchoice', 'budget energie', 'waternet', 'vitens', 'evides', 'ziggo', 'kpn', 'odido', 't-mobile', 'vodafone', 'gemeente', 'belastingdienst', 'hypotheek'].map((m) => ({ match: m, category: 'Wonen & energie' })),
  ...['spotify', 'netflix', 'disney', 'videoland', 'hbo', 'apple.com', 'google', 'youtube', 'amazon prime', 'chatgpt', 'openai', 'anthropic', 'icloud'].map((m) => ({ match: m, category: 'Abonnementen' })),
  ...['zilveren kruis', 'cz ', 'menzis', 'vgz', 'ditzo', 'ohra', 'apotheek', 'tandarts', 'huisarts', 'fysio', 'kruidvat', 'etos', 'da '].map((m) => ({ match: m, category: 'Zorg' })),
  ...['bol.com', 'zalando', 'h&m', 'zara', 'primark', 'action', 'hema', 'coolblue', 'mediamarkt', 'ikea', 'decathlon', 'amazon'].map((m) => ({ match: m, category: 'Kleding & winkels' })),
  ...['basic-fit', 'basic fit', 'sportschool', 'trainmore', 'anytime fitness', 'sportcity'].map((m) => ({ match: m, category: 'Sport' })),
  ...['pathe', 'pathé', 'kinepolis', 'ticketmaster', 'paylogic', 'eventbrite', 'steam', 'playstation'].map((m) => ({ match: m, category: 'Uitgaan & vrije tijd' })),
  ...['tabak', 'primera', 'tabaksspeciaalzaak', 'sigaret'].map((m) => ({ match: m, category: 'Roken' })),
  ...['degiro', 'trade republic', 'meesman', 'brand new day', 'bitvavo', 'coinbase', 'spaarrekening', 'vermogens spaar', 'direct sparen'].map((m) => ({ match: m, category: 'Sparen & beleggen' })),
  ...['salaris', 'loon', 'duo', 'toeslag', 'uwv', 'svb'].map((m) => ({ match: m, category: 'Inkomen' })),
  ...['tikkie', 'betaalverzoek'].map((m) => ({ match: m, category: 'Overboekingen' })),
];

export function categorize(
  description: string,
  amount: number,
  ownAccounts: string[],
  customRules: CategoryRule[] = [],
): string {
  const d = ` ${description.toLowerCase()} `;
  // Overboeking naar/van eigen rekening (bijv. betaal → spaar)
  if (ownAccounts.some((a) => a && d.includes(a.toLowerCase()))) return 'Sparen & beleggen';
  for (const r of [...customRules, ...DEFAULT_RULES]) {
    if (d.includes(r.match.toLowerCase())) return r.category;
  }
  return amount > 0 ? 'Inkomen' : 'Overig';
}
