import { BlogPost } from '../../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Synchronous functions for cached data
let cachedPosts: BlogPost[] = [];
let cachedTags: string[] = [];

export const getAllPostsSync = (): BlogPost[] => {
  return cachedPosts;
};

export const getAllTagsSync = (): string[] => {
  return cachedTags;
};

// Update cache when new data is fetched
const updateCache = (posts: BlogPost[]) => {
  cachedPosts = posts;
  const tags = new Set<string>();
  posts.forEach(post => {
    post.tags.forEach(tag => tags.add(tag));
  });
  cachedTags = Array.from(tags);
};

// Get all blog posts from the server
export const getAllPosts = async (): Promise<BlogPost[]> => {
  try {
    // Try primary API first
    const response = await fetch(`${API_URL}/posts`).catch(() => null);

    if (response && response.ok) {
      const posts = await response.json();
      updateCache(posts);
      return posts;
    }

    // Fallback to static JSON in public folder
    log('API unavailable, falling back to local blog-posts.json');
    const localResp = await fetch('/blog-posts.json');
    if (localResp.ok) {
      const posts = await localResp.json();
      updateCache(posts);
      return posts;
    }

    return [];
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return [];
  }
};

const log = (msg: string) => console.log(`[blogUtils] ${msg}`);

// Get a single post by slug
export const getPostBySlug = async (slug: string): Promise<BlogPost | null> => {
  try {
    // Check cache first
    const cached = cachedPosts.find(p => p.slug === slug);
    if (cached) return cached;

    // Try primary API
    const response = await fetch(`${API_URL}/posts/${slug}`).catch(() => null);
    if (response && response.ok) {
      return await response.json();
    }

    // Fallback to static JSON
    log(`Post ${slug} lookup falling back to local blog-posts.json`);
    const localResp = await fetch('/blog-posts.json');
    if (localResp.ok) {
      const posts: BlogPost[] = await localResp.json();
      updateCache(posts);
      return posts.find(p => p.slug === slug) || null;
    }

    return null;
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return null;
  }
};

// Save a blog post
export const savePost = async (post: BlogPost): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ post }),
    });

    if (!response.ok) {
      throw new Error('Failed to save post');
    }

    return true;
  } catch (error) {
    console.error('Error saving blog post:', error);
    return false;
  }
};

// Delete a blog post
export const deletePost = async (slug: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/posts/${slug}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete post');
    }

    return true;
  } catch (error) {
    console.error('Error deleting blog post:', error);
    return false;
  }
};

// Format a date for display
export const formatPublishDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

// Calculate reading time
export const calculateReadingTime = (content: string): string => {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
};

// Get posts by tag
export const getPostsByTag = async (tag: string): Promise<BlogPost[]> => {
  const posts = await getAllPosts();
  return posts.filter(post => post.tags.includes(tag));
};

// Get all unique tags from posts
export const getAllTags = async (): Promise<string[]> => {
  const posts = await getAllPosts();
  const tags = new Set<string>();
  posts.forEach(post => {
    post.tags.forEach(tag => tags.add(tag));
  });
  return Array.from(tags);
};

// Search posts by term
export const searchPosts = async (term: string): Promise<BlogPost[]> => {
  const posts = await getAllPosts();
  const searchTerm = term.toLowerCase();
  return posts.filter(post =>
    post.title.toLowerCase().includes(searchTerm) ||
    post.content.toLowerCase().includes(searchTerm) ||
    post.excerpt.toLowerCase().includes(searchTerm) ||
    post.tags.some(tag => tag.toLowerCase().includes(searchTerm))
  );
};

/** Get related posts by topic (shared tags). Weight primaryTag/main groups higher. */
export function getRelatedPostsByTopic(
  currentPost: BlogPost,
  allPosts: BlogPost[],
  limit: number = 4
): BlogPost[] {
  const currentTags = new Set((currentPost.tags || []).map((t) => t.toLowerCase()));
  const primaryTag = currentPost.primaryTag;
  const scored = allPosts
    .filter((p) => p.slug !== currentPost.slug)
    .map((post) => {
      let score = 0;
      for (const tag of post.tags || []) {
        const t = tag.toLowerCase();
        if (currentTags.has(t)) {
          score += primaryTag && t === primaryTag.toLowerCase() ? 3 : 1;
        }
      }
      return { post, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.post);
} 