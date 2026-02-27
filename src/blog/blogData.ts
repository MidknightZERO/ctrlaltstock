import { BlogPost } from '../types';

const API_URL = 'http://localhost:3001/api';

/**
 * Fetches all blog posts from API or static JSON fallback
 */
async function fetchPosts(): Promise<BlogPost[]> {
  try {
    const response = await fetch(`${API_URL}/posts`).catch(() => null);
    if (response && response.ok) {
      return await response.json();
    }
    const localResp = await fetch('/blog-posts.json');
    if (localResp.ok) {
      return await localResp.json();
    }
    return [];
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return [];
  }
}

/**
 * Fetches all blog posts
 */
export const fetchAllBlogPosts = (): Promise<BlogPost[]> => {
  return fetchPosts();
};

/**
 * Fetches recent blog posts (default: most recent 3)
 */
export const fetchRecentBlogPosts = (limit: number = 3): Promise<BlogPost[]> => {
  return fetchPosts().then((posts) => {
    const sorted = [...posts].sort(
      (a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
    );
    return sorted.slice(0, limit);
  });
};

/**
 * Fetches a blog post by slug
 */
export const fetchBlogPostBySlug = (slug: string): Promise<BlogPost | undefined> => {
  return fetchPosts().then((posts) => posts.find((post) => post.slug === slug));
};

/**
 * Fetches blog posts by tag
 */
export const fetchBlogPostsByTag = (tag: string): Promise<BlogPost[]> => {
  return fetchPosts().then((posts) =>
    posts.filter((post) => post.tags.some((t) => t.toLowerCase() === tag.toLowerCase()))
  );
};

/**
 * Formats the published date in a human-readable format
 */
export const formatPublishDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Extracts unique tags from all blog posts
 */
export const getAllUniqueTags = (): Promise<string[]> => {
  return fetchPosts().then((posts) => {
    const allTags = posts.flatMap((post) => post.tags);
    return [...new Set(allTags)];
  });
};
