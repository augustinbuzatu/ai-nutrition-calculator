// The official sites of chains people name, so the agent reads the values a
// chain publishes, not a blog's copy of them. Keys are names without case,
// diacritics, spaces or punctuation: "McDonald's" and "Mega Image" become
// "mcdonalds" and "megaimage".
const OFFICIAL_SITES: Record<string, readonly string[]> = {
  kfc: ["kfc.ro"],
  mcdonalds: ["mcdonalds.ro"],
  burgerking: ["burgerking.ro"],
  pizzahut: ["pizzahut.ro"],
  starbucks: ["starbucks.ro"],
  lidl: ["lidl.ro"],
  kaufland: ["kaufland.ro"],
  megaimage: ["mega-image.ro"],
  carrefour: ["carrefour.ro"],
  auchan: ["auchan.ro"],
  profi: ["profi.ro"],
  penny: ["penny.ro"],
  freshful: ["freshful.ro"],
};

/**
 * The sites to search for a place's values, or null for a place not listed,
 * which is searched on the whole web. "KFC Romania" and "kfc" both find KFC.
 */
export function officialSites(place: string): readonly string[] | null {
  const key = place
    .normalize("NFD")
    .replace(/\p{Mark}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  for (const [name, sites] of Object.entries(OFFICIAL_SITES)) {
    if (key.startsWith(name)) return sites;
  }
  return null;
}

/** Whether `url` is on one of `sites` or a subdomain of one ("www.kfc.ro"). */
export function isOnSites(url: string, sites: readonly string[]): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  return sites.some((site) => host === site || host.endsWith(`.${site}`));
}
