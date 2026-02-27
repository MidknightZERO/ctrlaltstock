/**
 * Tag hierarchy: main groups (bold) and nested subcategories.
 * Drives blog UI filtering, related posts, and stock image selection.
 */

export const MAIN_GROUPS = [
  'Hardware',
  'Peripherals',
  'Display',
  'Sound',
  'Graphics',
  'Software',
  'Console',
  'Storage',
  'Deals',
  'Guides',
] as const;

export type MainGroup = (typeof MAIN_GROUPS)[number];

/** Map: main group -> subcategories */
export const SUBCATEGORY_MAP: Record<MainGroup, string[]> = {
  Hardware: [
    'Graphics Cards',
    'CPU',
    'RAM',
    'Coolers',
    'SSD',
    'Motherboard',
    'PSU',
    'Storage',
    'Case',
  ],
  Peripherals: [
    'Keyboards',
    'Mice',
    'Controllers',
    'Webcams',
    'Microphones',
    'VR Headsets',
    'Monitors',
  ],
  Display: ['Monitors', 'TVs', 'Projectors', 'Mobile Phones', 'VR/AR'],
  Sound: ['Headphones', 'Headsets', 'Speakers', 'AV Receivers', 'Microphones'],
  Graphics: ['Graphics Cards', 'Tablets', 'VFX Software', '3D Software'],
  Software: ['Drivers', 'Gaming', 'Productivity', 'OS'],
  Console: ['PlayStation', 'Xbox', 'Steam Deck', 'Nintendo', 'Handheld'],
  Storage: ['SSD', 'NVMe', 'HDD', 'External Drives', 'NAS'],
  Deals: ['Stock Alerts', 'Price Drops', 'Restocks'],
  Guides: ['Buying Guides', 'Build Guides', 'Tutorials'],
};

/** All subcategories flattened */
export const ALL_SUBCATEGORIES = MAIN_GROUPS.flatMap((g) => SUBCATEGORY_MAP[g]);

/**
 * Allowlist of displayable tags for Topics filter.
 * Filters out word-salad and irrelevant tags; posts still filter by ?tag= for any tag.
 */
export const DISPLAY_TAGS = new Set([
  ...MAIN_GROUPS,
  ...ALL_SUBCATEGORIES,
  'GPU',
  'CPU',
  'PlayStation',
  'Xbox',
  'Deals',
  'Guides',
  'NVIDIA',
  'AMD',
  'Gaming',
  'Hardware',
  'Console',
  'Graphics Cards',
  'SSD',
  'RAM',
  'AMD Radeon',
  'AMD Adrenalin',
  'Driver Update',
  'Stability Fix',
]);

/** Check if a tag should be shown in Topics UI (avoids word-salad) */
export function isDisplayableTag(tag: string): boolean {
  if (!tag || tag.length > 30) return false;
  return DISPLAY_TAGS.has(tag) || isMainGroup(tag) || getMainGroupForTag(tag) !== null;
}

/** Check if a string is a main group */
export function isMainGroup(tag: string): boolean {
  return MAIN_GROUPS.includes(tag as MainGroup);
}

/** Get main group for a tag (subcategory or tag string) */
export function getMainGroupForTag(tag: string): MainGroup | null {
  if (isMainGroup(tag)) return tag as MainGroup;
  for (const [main, subs] of Object.entries(SUBCATEGORY_MAP)) {
    if (subs.includes(tag)) return main as MainGroup;
  }
  return null;
}
