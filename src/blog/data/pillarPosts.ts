/**
 * Pillar posts: main guides that get priority in the blog hero and internal linking.
 * Slugs match existing or planned pillar content (buying guides, roundups).
 */

export const PILLAR_SLUGS: string[] = [
  'amd-adrenalin-26-2-2-rx-7000-stability-update',
  'amd-zen-6-olympic-ridge-ryzen-desktop-cpus-may-come-in-in-6-8-10-12-16-20-and-24',
  'nvidia-confirms-rtx-gpu-shortage-2026',
  'were-we-wrong-about-ryzen-s-best-feature',
  'resident-evil-requiem-df-analysis-ps5-pro-performance',
];

export const PILLAR_TOPICS: { slug: string; title: string }[] = [
  { slug: 'amd-adrenalin-26-2-2-rx-7000-stability-update', title: 'AMD Adrenalin RX 7000 Stability' },
  { slug: 'amd-zen-6-olympic-ridge-ryzen-desktop-cpus-may-come-in-in-6-8-10-12-16-20-and-24', title: 'Ryzen Olympic Ridge CPUs 2026' },
  { slug: 'nvidia-confirms-rtx-gpu-shortage-2026', title: 'NVIDIA RTX GPU Shortage 2026' },
  { slug: 'were-we-wrong-about-ryzen-s-best-feature', title: 'Ryzen Best Feature' },
  { slug: 'resident-evil-requiem-df-analysis-ps5-pro-performance', title: 'Resident Evil Requiem PS5 Pro' },
];

import type { BlogPost } from '../../types';

/**
 * Returns posts for the hero: pillar posts first (in PILLAR_SLUGS order), then newest.
 */
export function getPillarPosts(posts: BlogPost[], count = 5): BlogPost[] {
  const bySlug = new Map(posts.map((p) => [p.slug, p]));
  const pillar: BlogPost[] = [];
  for (const slug of PILLAR_SLUGS) {
    const p = bySlug.get(slug);
    if (p) pillar.push(p);
  }
  const rest = posts.filter((p) => !PILLAR_SLUGS.includes(p.slug));
  return [...pillar, ...rest].slice(0, count);
}
