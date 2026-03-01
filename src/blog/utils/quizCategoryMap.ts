/**
 * Maps article tags to Open Trivia DB category IDs for topic-relevant quizzes.
 * https://opentdb.com/api_category.php
 */

export const OPEN_TRIVIA_CATEGORIES = {
  GENERAL_KNOWLEDGE: 9,
  VIDEO_GAMES: 15,
  SCIENCE_COMPUTERS: 18,
  SCIENCE_GADGETS: 30,
} as const;

/** Tags that indicate video game / console content → category 15 */
const VIDEO_GAME_TAGS = [
  'gaming', 'game', 'games', 'ps5', 'ps4', 'xbox', 'playstation', 'nintendo',
  'switch', 'steam deck', 'console', 'consoles', 'rog ally', 'handheld',
];

/** Tags that indicate PC / computer tech → category 18 */
const COMPUTER_TAGS = [
  'gpu', 'cpu', 'pc', 'computers', 'tech', 'nvidia', 'amd', 'intel',
  'graphics', 'motherboard', 'ram', 'ssd', 'storage', 'drivers', 'software',
];

/** Tags that indicate gadgets / hardware → category 30 */
const GADGET_TAGS = [
  'gadgets', 'monitor', 'monitors', 'display', 'hardware',
];

/**
 * Derives Open Trivia DB category ID from post tags.
 * Video game articles → 15 (Entertainment: Video Games)
 * PC/tech → 18 (Science: Computers)
 * Gadgets → 30 (Science: Gadgets)
 * Default → 9 (General Knowledge)
 */
export function getQuizCategoryId(tags: string[]): number {
  const lower = tags.map((t) => t.toLowerCase().trim());
  for (const tag of lower) {
    if (VIDEO_GAME_TAGS.some((t) => tag.includes(t) || t.includes(tag))) {
      return OPEN_TRIVIA_CATEGORIES.VIDEO_GAMES;
    }
  }
  for (const tag of lower) {
    if (COMPUTER_TAGS.some((t) => tag.includes(t) || t.includes(tag))) {
      return OPEN_TRIVIA_CATEGORIES.SCIENCE_COMPUTERS;
    }
  }
  for (const tag of lower) {
    if (GADGET_TAGS.some((t) => tag.includes(t) || t.includes(tag))) {
      return OPEN_TRIVIA_CATEGORIES.SCIENCE_GADGETS;
    }
  }
  return OPEN_TRIVIA_CATEGORIES.GENERAL_KNOWLEDGE;
}

/**
 * Difficulty for video games (hard) vs others (medium).
 */
export function getQuizDifficulty(categoryId: number): 'easy' | 'medium' | 'hard' {
  if (categoryId === OPEN_TRIVIA_CATEGORIES.VIDEO_GAMES) {
    return 'hard';
  }
  return 'medium';
}
