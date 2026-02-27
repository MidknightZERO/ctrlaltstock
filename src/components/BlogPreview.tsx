import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { BlogPost } from '../types';
import { parseMarkdownToBlogPost } from '../blog/utils/markdownUtils';

// Import all blog post markdown files directly
// This uses Vite's import.meta.glob feature for static site generation
const postFiles = import.meta.glob('../blog/posts/*.md', { eager: true });

const BlogPreview: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPostsFromMarkdown = () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log("Loading preview posts from markdown files");
        console.log("Found files:", Object.keys(postFiles));
        
        const parsedPosts: BlogPost[] = [];
        
        // Process each markdown file using our utility
        Object.entries(postFiles).forEach(([path, module]: [string, any]) => {
          try {
            const fileContent = module.default; // Raw markdown content
            
            if (!fileContent) {
              console.warn(`No content in file: ${path}`);
              return;
            }
            
            // Extract slug from filename
            const filenameMatch = path.match(/\/([^/]+)\.md$/);
            const slug = filenameMatch ? filenameMatch[1] : `post-${parsedPosts.length}`;
            
            // Parse the markdown using our utility
            const post = parseMarkdownToBlogPost(fileContent, slug);
            
            if (post) {
              parsedPosts.push(post);
              console.log(`Parsed preview post: ${post.title}`);
            } else {
              console.warn(`Failed to parse post: ${path}`);
            }
          } catch (err) {
            console.error(`Error processing file ${path}:`, err);
          }
        });
        
        if (parsedPosts.length === 0) {
          setError("No blog posts found. Check the blog posts directory.");
          setLoading(false);
          return;
        }
        
        console.log(`Loaded ${parsedPosts.length} posts from markdown files`);
        
        // Sort by date (newest first) and take the first 3
        const sortedPosts = parsedPosts
          .sort((a, b) => 
            new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
          )
          .slice(0, 3);
        
        setPosts(sortedPosts);
      } catch (error) {
        console.error('Failed to load blog posts:', error);
        setError('Could not load latest blog posts. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    loadPostsFromMarkdown();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-10 h-10 text-[#9ed04b] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No blog posts found.</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-8">
      {posts.map(post => (
        <div key={post.slug} className="bg-gray-900 rounded-lg overflow-hidden shadow-lg transform transition-transform duration-300 hover:scale-105">
          <Link to={`/blog/${post.slug}`} className="block">
            <img 
              src={post.coverImage || 'https://i.imgur.com/pNXpqv8.jpg'} 
              alt={post.title} 
              className="w-full h-48 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://i.imgur.com/pNXpqv8.jpg';
              }}
            />
          </Link>
          <div className="p-6">
            <Link to={`/blog/${post.slug}`}>
              <h3 className="text-xl font-bold mb-2 hover:text-[#9ed04b] transition-colors line-clamp-2">
                {post.title}
              </h3>
            </Link>
            <p className="text-gray-400 mb-4 line-clamp-2">
              {post.excerpt}
            </p>
            <Link 
              to={`/blog/${post.slug}`}
              className="text-[#9ed04b] hover:text-[#9ed04b]/80 transition-colors inline-flex items-center"
            >
              Read more
              <ArrowRight size={16} className="ml-2" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BlogPreview; 