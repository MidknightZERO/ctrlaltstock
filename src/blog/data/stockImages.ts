/**
 * Stock images organised by tag hierarchy (main group -> subcategory -> URLs).
 * Used by frontend image picker and bot image_fetcher.
 * Sources: Unsplash/Pexels direct CDN URLs (free, no API key).
 */

export const STOCK_IMAGES: Record<string, Record<string, string[]> | string[]> = {
  Hardware: {
    'Graphics Cards': [
      'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=1200',
      'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=1200',
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200',
      'https://images.unsplash.com/photo-1603732551658-5fabbafa84eb?w=1200',
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200',
      'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=1200',
      'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200',
      'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=1200',
    ],
    CPU: [
      'https://images.unsplash.com/photo-1555617981-dac3880eac6e?w=1200',
      'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=1200',
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200',
      'https://images.unsplash.com/photo-1555617981-dac3880eac6e?w=1200',
    ],
    RAM: [
      'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=1200',
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200',
    ],
    Storage: [
      'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=1200',
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200',
    ],
    default: [
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200',
      'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=1200',
      'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=1200',
      'https://images.unsplash.com/photo-1555617981-dac3880eac6e?w=1200',
      'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=1200',
      'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200',
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200',
      'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=1200',
      'https://images.unsplash.com/photo-1603732551658-5fabbafa84eb?w=1200',
    ],
  },
  Display: {
    Monitors: [
      'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=1200',
      'https://images.unsplash.com/photo-1616763355603-9755a640a287?w=1200',
      'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=1200',
    ],
    default: [
      'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=1200',
      'https://images.unsplash.com/photo-1616763355603-9755a640a287?w=1200',
    ],
  },
  Console: {
    default: [
      'https://images.unsplash.com/photo-1616588589676-62b3bd4ff6d2?w=1200',
      'https://images.unsplash.com/photo-1486572788966-cfd3df1f5b42?w=1200',
      'https://images.unsplash.com/photo-1593640408182-31c228cf1b43?w=1200',
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200',
    ],
  },
  Software: {
    default: [
      'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200',
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200',
    ],
  },
  default: [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200',
    'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=1200',
    'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=1200',
    'https://images.unsplash.com/photo-1555617981-dac3880eac6e?w=1200',
    'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=1200',
    'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200',
    'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=1200',
    'https://images.unsplash.com/photo-1603732551658-5fabbafa84eb?w=1200',
  ],
};

/** Get all image URLs flattened for bot consumption */
export function getAllStockImageUrls(): string[] {
  const urls: string[] = [];
  for (const [main, subs] of Object.entries(STOCK_IMAGES)) {
    if (Array.isArray(subs)) {
      urls.push(...subs);
    } else {
      for (const arr of Object.values(subs)) {
        urls.push(...arr);
      }
    }
  }
  return [...new Set(urls)];
}
