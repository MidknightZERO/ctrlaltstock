import { BlogPost } from '../../types';

/**
 * Get all posts from localStorage (editor cache) or empty array.
 * Used by local editor; main blog uses blogUtils.getAllPosts() which fetches from API/blog-posts.json.
 */
export const getAllPosts = (): BlogPost[] => {
  try {
    const localPosts = localStorage.getItem('blogPosts');
    if (localPosts) {
      const parsedPosts = JSON.parse(localPosts);
      if (Array.isArray(parsedPosts) && parsedPosts.length > 0) {
        return parsedPosts;
      }
    }
  } catch (error) {
    console.error('Error loading posts from localStorage:', error);
  }
  return [];
};

/**
 * Save posts to localStorage (editor cache)
 */
export const savePosts = (posts: BlogPost[]): void => {
  try {
    localStorage.setItem('blogPosts', JSON.stringify(posts));
  } catch (error) {
    console.error('Error saving posts to localStorage:', error);
  }
};

export type { BlogPost };
