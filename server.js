import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Path to blog posts directory
const POSTS_DIR = path.join(__dirname, 'src', 'blog', 'posts');

// Ensure posts directory exists
if (!existsSync(POSTS_DIR)) {
  mkdirSync(POSTS_DIR, { recursive: true });
}

// Save a blog post to the file system as markdown
app.post('/api/posts', async (req, res) => {
  try {
    const { post } = req.body;
    
    if (!post || !post.title || !post.content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Generate slug if not provided
    const slug = post.slug || post.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    // Create the file path
    const filePath = path.join(POSTS_DIR, `${slug}.md`);
    
    // Format the post as a markdown file with frontmatter
    const frontMatter = {
      title: post.title,
      date: post.publishedDate || new Date().toISOString().split('T')[0],
      author: post.author,
      excerpt: post.excerpt || '',
      tags: post.tags || [],
      featuredProductId: post.featuredProductId || '',
      recommendedProductIds: post.recommendedProductIds || [],
      readingTime: post.readingTime || '5 min read',
      coverImage: post.coverImage || '',
      images: post.images || []
    };
    
    // Add contentBlocks if available
    if (post.contentBlocks && post.contentBlocks.length > 0) {
      frontMatter.contentBlocks = post.contentBlocks;
    }
    
    // Create the markdown content
    const markdown = matter.stringify(post.content, frontMatter);
    
    // Write the file
    await fs.writeFile(filePath, markdown, 'utf8');
    
    // Update the blog-posts.json file
    exec('npm run build:blog', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error running build:blog script: ${error.message}`);
      }
      if (stderr) console.error(`build:blog errors: ${stderr}`);
      console.log(`build:blog output: ${stdout}`);
    });
    
    res.json({ 
      success: true, 
      message: 'Post saved successfully',
      slug,
      filePath 
    });
  } catch (error) {
    console.error('Error saving post:', error);
    res.status(500).json({ error: 'Failed to save post' });
  }
});

// Get all blog posts
app.get('/api/posts', async (req, res) => {
  try {
    const files = await fs.readdir(POSTS_DIR);
    const posts = [];
    
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      
      const filePath = path.join(POSTS_DIR, file);
      const fileContent = await fs.readFile(filePath, 'utf8');
      const { data: frontMatter, content } = matter(fileContent);
      
      const post = {
        id: path.basename(file, '.md'),
        slug: path.basename(file, '.md'),
        title: frontMatter.title,
        publishedDate: frontMatter.date,
        content: content,
        excerpt: frontMatter.excerpt,
        readingTime: frontMatter.readingTime,
        coverImage: frontMatter.coverImage,
        tags: frontMatter.tags || [],
        images: frontMatter.images || [],
        featuredProductId: frontMatter.featuredProductId,
        recommendedProductIds: frontMatter.recommendedProductIds || [],
        contentBlocks: frontMatter.contentBlocks || [],
        author: frontMatter.author
      };
      
      posts.push(post);
    }
    
    res.json(posts);
  } catch (error) {
    console.error('Error getting posts:', error);
    res.status(500).json({ error: 'Failed to get posts' });
  }
});

// Fallback posts when no .md file exists (keep list and single-post in sync)
function createFallbackPosts() {
  return [
    {
      id: 'rtx-4090-stock',
      slug: 'rtx-4090-stock',
      title: 'RTX 4090 Stock: Where to Find Them in 2023',
      publishedDate: '2023-06-15',
      author: { name: 'Alex Johnson', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Alex', bio: 'Hardware enthusiast and stock tracker for high-end GPUs' },
      excerpt: "A comprehensive guide to finding NVIDIA's flagship RTX 4090 GPU in stock at various retailers despite ongoing shortages.",
      content: "# RTX 4090 Stock: Where to Find Them in 2023\n\nFinding NVIDIA's flagship RTX 4090 GPU continues to be challenging in 2023. Despite its high price point of $1,599, demand remains strong for this powerhouse graphics card, particularly among enthusiasts, content creators, and AI researchers.",
      tags: ['GPU', 'NVIDIA', 'RTX 4090', 'Stock Alerts'],
      readingTime: '8 min read',
      coverImage: 'https://images.unsplash.com/photo-1624033713319-78f1bc062757?q=80&w=1932&auto=format&fit=crop',
      featuredProductId: 'p1',
      recommendedProductIds: ['p2', 'p3', 'p9']
    },
    {
      id: 'ps5-pro-hunting-guide',
      slug: 'ps5-pro-hunting-guide',
      title: "PS5 Pro Hunting Guide: Finding Sony's Elusive Console",
      publishedDate: '2023-10-20',
      author: { name: 'Jessica Wu', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Jessica', bio: 'Gaming journalist and console availability expert' },
      excerpt: "A detailed guide on how to secure the PlayStation 5 Pro amid limited stock and high demand across retail channels.",
      content: "# PS5 Pro Hunting Guide: Finding Sony's Elusive Console\n\nThe PlayStation 5 Pro represents Sony's mid-generation console upgrade, offering enhanced performance, improved ray tracing, and faster load times. However, securing one remains challenging due to limited production runs and overwhelming demand.",
      tags: ['PlayStation', 'PS5 Pro', 'Gaming', 'Stock Alerts', 'Console'],
      readingTime: '7 min read',
      coverImage: 'https://images.unsplash.com/photo-1607853202273-797f1c22a38e?q=80&w=2564&auto=format&fit=crop',
      featuredProductId: 'p5',
      recommendedProductIds: ['p6', 'p7', 'p8']
    }
  ];
}

function getFallbackPostBySlug(slug) {
  const post = createFallbackPosts().find(p => p.slug === slug);
  return post || null;
}

// Get a single blog post by slug
app.get('/api/posts/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const filePath = path.join(POSTS_DIR, `${slug}.md`);
    
    if (!existsSync(filePath)) {
      const fallbackPost = getFallbackPostBySlug(slug);
      if (fallbackPost) {
        return res.json(fallbackPost);
      }
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const fileContent = await fs.readFile(filePath, 'utf8');
    const { data: frontMatter, content } = matter(fileContent);
    
    const post = {
      id: slug,
      slug,
      title: frontMatter.title,
      publishedDate: frontMatter.date,
      content: content,
      excerpt: frontMatter.excerpt,
      readingTime: frontMatter.readingTime,
      coverImage: frontMatter.coverImage,
      tags: frontMatter.tags || [],
      images: frontMatter.images || [],
      featuredProductId: frontMatter.featuredProductId,
      recommendedProductIds: frontMatter.recommendedProductIds || [],
      contentBlocks: frontMatter.contentBlocks || [],
      author: frontMatter.author
    };
    
    res.json(post);
  } catch (error) {
    console.error('Error getting post:', error);
    res.status(500).json({ error: 'Failed to get post' });
  }
});

// Delete a blog post
app.delete('/api/posts/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const filePath = path.join(POSTS_DIR, `${slug}.md`);
    
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    await fs.unlink(filePath);
    
    // Update the blog-posts.json file
    exec('npm run build:blog', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error running build:blog script: ${error.message}`);
      }
      if (stderr) console.error(`build:blog errors: ${stderr}`);
      console.log(`build:blog output: ${stdout}`);
    });
    
    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 