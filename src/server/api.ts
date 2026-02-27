/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import express from 'express';
import { writeFileSync, readFileSync, unlinkSync, existsSync, mkdirSync, readdirSync } from 'fs';
import path from 'path';
import cors from 'cors';
import { BlogPost } from '../types';
import { products, getProductById, getProductsByCategory, getProductsByTag } from '../blog/productData';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors({
  origin: '*', // Allow all origins for debugging
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Debug logging
console.log('===== SERVER STARTING =====');
console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);

// IMPORTANT: This is the critical part - finding the posts directory
// Try multiple possible paths for the posts directory
const possiblePaths = [
  path.join(process.cwd(), 'src', 'blog', 'posts'),  // Running from project root
  path.join(__dirname, '..', 'blog', 'posts'),      // Relative to server directory
  path.resolve(__dirname, '..', 'blog', 'posts'),   // Absolute path
  path.join(process.cwd(), 'blog', 'posts'),        // Another possibility
];

let postsDir = '';
for (const testPath of possiblePaths) {
  console.log(`Testing path: ${testPath}`);
  if (existsSync(testPath)) {
    postsDir = testPath;
    console.log(`✅ Found posts directory: ${postsDir}`);
    break;
  }
}

if (!postsDir) {
  console.error('❌ Could not find posts directory in any of the tried paths!');
  // Use the first path as fallback and try to create it
  postsDir = possiblePaths[0];
  console.log(`Creating posts directory at: ${postsDir}`);
  try {
    mkdirSync(postsDir, { recursive: true });
    console.log(`✅ Created posts directory: ${postsDir}`);
  } catch (err) {
    console.error(`❌ Failed to create posts directory: ${err.message}`);
  }
}

// Check and log what files we can actually see
try {
  console.log('TRYING TO READ DIRECTORY:', postsDir);
  console.log('DIRECTORY EXISTS?', existsSync(postsDir));
  
  const files = readdirSync(postsDir);
  console.log(`FOUND FILES (${files.length}):`, files);
  const mdFiles = files.filter(file => file.endsWith('.md'));
  console.log(`MARKDOWN FILES FOUND (${mdFiles.length}):`, mdFiles);
  
  // Sample content of the first file for debugging
  if (mdFiles.length > 0) {
    const firstFilePath = path.join(postsDir, mdFiles[0]);
    console.log(`READING FIRST FILE: ${firstFilePath}`);
    try {
      // Let's try to read the file with different encoding options
      let content = '';
      try {
        content = readFileSync(firstFilePath, 'utf8');
        console.log('UTF-8 ENCODING WORKED');
      } catch (err) {
        console.error('UTF-8 ENCODING FAILED, TRYING UTF-16');
        content = readFileSync(firstFilePath, 'utf16le');
        console.log('UTF-16 ENCODING WORKED');
      }
      console.log(`FIRST FILE CONTENT SAMPLE: ${content.substring(0, 200)}...`);
      
      // Try to parse the markdown
      const frontMatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
      const match = content.match(frontMatterRegex);
      if (match) {
        console.log('FRONT MATTER REGEX MATCHED SUCCESSFULLY');
      } else {
        console.log('FRONT MATTER REGEX FAILED TO MATCH');
        console.log('CONTENT STARTS WITH:', content.substring(0, 50));
      }
    } catch (err) {
      console.error(`ERROR READING FIRST FILE: ${err.message}`);
      console.error(err.stack);
    }
  } else {
    console.log('NO MARKDOWN FILES FOUND IN DIRECTORY');
  }
} catch (err) {
  console.error(`❌ ERROR LISTING FILES IN POSTS DIRECTORY: ${err.message}`);
  console.error(err.stack);
}

// Helper to derive a URL-safe slug from title when slug is missing
const slugFromTitle = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// Helper function to save a blog post as a markdown file (persists to disk so posts survive reloads)
const saveBlogPostAsMarkdown = (post: BlogPost): string => {
  // Ensure slug exists so we never write undefined.md
  const slug = (post.slug && post.slug.trim()) || slugFromTitle(post.title || 'untitled');
  const postWithSlug = { ...post, slug };

  // Process arrays to ensure they have proper quotes
  const formattedTags = postWithSlug.tags ? postWithSlug.tags.map(tag => `"${tag.replace(/"/g, '\\"')}"`) : [];
  const formattedRecommendedIds = postWithSlug.recommendedProductIds
    ? postWithSlug.recommendedProductIds.map(id => `"${id.replace(/"/g, '\\"')}"`)
    : [];
  const formattedImages = postWithSlug.images
    ? postWithSlug.images.map(img => `"${img.replace(/"/g, '\\"')}"`)
    : [];

  // Generate markdown content
  let markdown = `---
title: ${postWithSlug.title}
date: ${postWithSlug.publishedDate}
author:
  name: ${postWithSlug.author.name}
  avatar: ${postWithSlug.author.avatar}
  bio: ${postWithSlug.author.bio}
excerpt: ${postWithSlug.excerpt}
tags: [${formattedTags.join(', ')}]
featuredProductId: "${postWithSlug.featuredProductId || ''}"
recommendedProductIds: [${formattedRecommendedIds.join(', ')}]
readingTime: ${postWithSlug.readingTime}
coverImage: ${postWithSlug.coverImage || ''}
images: [${formattedImages.join(', ')}]
---

${postWithSlug.content}
`;

  // Ensure posts directory exists so persistence always works
  if (!existsSync(postsDir)) {
    mkdirSync(postsDir, { recursive: true });
    console.log(`Created posts directory: ${postsDir}`);
  }

  const filePath = path.join(postsDir, `${slug}.md`);
  writeFileSync(filePath, markdown, 'utf8');
  return filePath;
};

// Helper function to convert markdown file to blog post object
const markdownToBlogPost = (filePath: string): BlogPost => {
  console.log(`Processing markdown file: ${filePath}`);
  const filename = path.basename(filePath, '.md');
  console.log(`Filename (slug): ${filename}`);
  
  const content = readFileSync(filePath, 'utf8');
  console.log(`File content length: ${content.length} characters`);
  
  // Extract front matter
  const frontMatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontMatterRegex);
  
  if (!match) {
    console.error(`Invalid markdown format in file: ${filePath}`);
    throw new Error('Invalid markdown format, missing front matter');
  }
  
  const [, frontMatter, markdownContent] = match;
  console.log(`Front matter length: ${frontMatter.length} characters`);
  console.log(`Markdown content length: ${markdownContent.length} characters`);
  
  // Parse front matter
  const frontMatterLines = frontMatter.split('\n');
  const post: Partial<BlogPost> = {
    id: filename,
    slug: filename,
    content: markdownContent.trim()
  };
  
  // Process each line of front matter
  let currentKey: string | null = null;
  let inAuthor = false;
  let authorData: any = {};
  
  frontMatterLines.forEach(line => {
    if (line.trim() === '') return;
    
    if (line.startsWith('  ') && inAuthor) {
      // Author attribute
      const [key, value] = line.trim().split(': ');
      authorData[key] = value;
      return;
    }
    
    if (line.startsWith('author:')) {
      inAuthor = true;
      currentKey = null;
      return;
    }
    
    if (!line.startsWith('  ')) {
      inAuthor = false;
    }
    
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return;
    
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    
    switch (key) {
      case 'title':
        post.title = value;
        break;
      case 'date':
        post.publishedDate = value;
        break;
      case 'excerpt':
        post.excerpt = value;
        break;
      case 'readingTime':
        post.readingTime = value;
        break;
      case 'coverImage':
        post.coverImage = value;
        break;
      case 'featuredProductId':
        post.featuredProductId = value;
        break;
      case 'recommendedProductIds':
        if (value.startsWith('[') && value.endsWith(']')) {
          post.recommendedProductIds = value.slice(1, -1).split(',').map(id => id.trim());
        } else if (value) {
          post.recommendedProductIds = [value];
        }
        break;
      case 'tags':
        if (value.startsWith('[') && value.endsWith(']')) {
          post.tags = value.slice(1, -1).split(',').map(tag => tag.trim());
        } else {
          post.tags = [value];
        }
        break;
      case 'images':
        if (value.startsWith('[') && value.endsWith(']')) {
          post.images = value.slice(1, -1).split(',').map(img => img.trim());
        } else if (value) {
          post.images = [value];
        } else {
          post.images = [];
        }
        break;
    }
  });
  
  // Add author data
  post.author = {
    name: authorData.name || 'Anonymous',
    avatar: authorData.avatar || '',
    bio: authorData.bio || ''
  };
  
  console.log(`Parsed blog post: ${post.title} (${post.slug})`);
  return post as BlogPost;
};

// API Routes
// POST /api/posts - Create/update a blog post
app.post('/api/posts', (req, res) => {
  try {
    const { post } = req.body;
    
    if (!post || !post.title || !post.content) {
      return res.status(400).json({ error: 'Missing required post data' });
    }
    
    const filePath = saveBlogPostAsMarkdown(post);
    res.json({ success: true, message: 'Post saved successfully', filePath });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to save post' });
  }
});

// GET /api/posts - Get all blog posts
app.get('/api/posts', (req, res) => {
  try {
    console.log('===== GET /api/posts - Fetching all blog posts =====');
    
    if (!existsSync(postsDir)) {
      console.error(`Posts directory does not exist: ${postsDir}`);
      // Let's create a fallback post to ensure something is returned
      return res.json(createFallbackPosts());
    }
    
    const files = readdirSync(postsDir)
      .filter(file => file.endsWith('.md'));
    
    console.log(`Found ${files.length} markdown files in ${postsDir}:`, files);
    
    if (files.length === 0) {
      console.warn('No markdown files found, returning fallback posts');
      return res.json(createFallbackPosts());
    }
    
    const posts = [];
    let parseErrors = 0;
    
    for (const file of files) {
      try {
        const filePath = path.join(postsDir, file);
        console.log(`Processing file: ${filePath}`);
        
        const content = readFileSync(filePath, 'utf8');
        const filename = path.basename(filePath, '.md');
        
        // Extract front matter
        const frontMatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
        const match = content.match(frontMatterRegex);
        
        if (!match) {
          console.error(`Invalid markdown format in file: ${filePath}`);
          parseErrors++;
          continue;
        }
        
        const [, frontMatter, markdownContent] = match;
        
        // Simple parser for front matter
        const post = {
          id: filename,
          slug: filename,
          content: markdownContent.trim(),
          tags: [],
          images: [],
          recommendedProductIds: []
        };
        
        // Parse front matter lines
        const frontMatterLines = frontMatter.split('\n');
        let inAuthor = false;
        let authorData = { name: 'Anonymous', avatar: '', bio: '' };
        
        for (const line of frontMatterLines) {
          const trimmedLine = line.trim();
          if (trimmedLine === '') continue;
          
          if (trimmedLine.startsWith('author:')) {
            inAuthor = true;
            continue;
          }
          
          if (inAuthor && trimmedLine.startsWith('name:')) {
            authorData.name = trimmedLine.substring(5).trim();
            continue;
          }
          
          if (inAuthor && trimmedLine.startsWith('avatar:')) {
            authorData.avatar = trimmedLine.substring(7).trim();
            continue;
          }
          
          if (inAuthor && trimmedLine.startsWith('bio:')) {
            authorData.bio = trimmedLine.substring(4).trim();
            continue;
          }
          
          if (!trimmedLine.startsWith(' ')) {
            inAuthor = false;
          }
          
          const colonIndex = trimmedLine.indexOf(':');
          if (colonIndex === -1) continue;
          
          const key = trimmedLine.slice(0, colonIndex).trim();
          const value = trimmedLine.slice(colonIndex + 1).trim();
          
          switch (key) {
            case 'title':
              post.title = value;
              break;
            case 'date':
              post.publishedDate = value;
              break;
            case 'excerpt':
              post.excerpt = value;
              break;
            case 'readingTime':
              post.readingTime = value;
              break;
            case 'coverImage':
              post.coverImage = value;
              break;
            case 'featuredProductId':
              post.featuredProductId = value;
              break;
            case 'recommendedProductIds':
              if (value.startsWith('[') && value.endsWith(']')) {
                post.recommendedProductIds = value.slice(1, -1).split(',').map(id => id.trim());
              }
              break;
            case 'tags':
              if (value.startsWith('[') && value.endsWith(']')) {
                post.tags = value.slice(1, -1).split(',').map(tag => tag.trim());
              }
              break;
            case 'images':
              if (value.startsWith('[') && value.endsWith(']')) {
                post.images = value.slice(1, -1).split(',').map(img => img.trim());
              }
              break;
          }
        }
        
        post.author = authorData;
        posts.push(post);
        console.log(`Successfully parsed post: ${post.title}`);
      } catch (error) {
        console.error(`Error parsing ${file}:`, error);
        parseErrors++;
      }
    }
    
    console.log(`Returning ${posts.length} blog posts (${parseErrors} parse errors)`);
    
    if (posts.length === 0 && parseErrors > 0) {
      console.warn('All posts had parse errors, returning fallback posts');
      return res.json(createFallbackPosts());
    }
    
    // Sort by published date (newest first)
    posts.sort((a: any, b: any) => {
      const dateA = new Date(a.publishedDate || 0).getTime();
      const dateB = new Date(b.publishedDate || 0).getTime();
      return dateB - dateA;
    });
    
    res.json(posts);
  } catch (error) {
    console.error('Failed to get posts:', error);
    res.json(createFallbackPosts());
  }
});

// GET /api/posts/:slug - Get a specific blog post
app.get('/api/posts/:slug', (req, res) => {
  try {
    const { slug } = req.params;
    console.log(`GET /api/posts/${slug} - Fetching specific blog post`);
    
    if (!existsSync(postsDir)) {
      console.error(`Posts directory does not exist: ${postsDir}`);
      return res.status(500).json({ 
        error: 'Posts directory does not exist',
        path: postsDir,
        tried: possiblePaths
      });
    }
    
    // Try both with and without .md extension
    let filePath = path.join(postsDir, `${slug}.md`);
    if (!existsSync(filePath)) {
      filePath = path.join(postsDir, slug);
      if (!existsSync(filePath)) {
        // Serve in-memory fallback post by slug so list and single-post stay in sync
        const fallbackPost = getFallbackPostBySlug(slug);
        if (fallbackPost) {
          console.log(`Serving fallback post: ${slug}`);
          return res.json(fallbackPost);
        }
        console.error(`Post not found: ${slug}`);
        return res.status(404).json({ error: 'Post not found', slug });
      }
    }
    
    console.log(`Found post file: ${filePath}`);
    
    try {
      const content = readFileSync(filePath, 'utf8');
      const filename = path.basename(filePath, '.md');
      
      // Extract front matter
      const frontMatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
      const match = content.match(frontMatterRegex);
      
      if (!match) {
        console.error(`Invalid markdown format in file: ${filePath}`);
        return res.status(500).json({ error: 'Invalid markdown format', slug });
      }
      
      const [, frontMatter, markdownContent] = match;
      
      // Simple parser for front matter
      const post = {
        id: filename,
        slug: filename,
        content: markdownContent.trim(),
        tags: [],
        images: [],
        recommendedProductIds: []
      };
      
      // Parse front matter lines
      const frontMatterLines = frontMatter.split('\n');
      let inAuthor = false;
      let authorData = { name: 'Anonymous', avatar: '', bio: '' };
      
      for (const line of frontMatterLines) {
        const trimmedLine = line.trim();
        if (trimmedLine === '') continue;
        
        if (trimmedLine.startsWith('author:')) {
          inAuthor = true;
          continue;
        }
        
        if (inAuthor && trimmedLine.startsWith('name:')) {
          authorData.name = trimmedLine.substring(5).trim();
          continue;
        }
        
        if (inAuthor && trimmedLine.startsWith('avatar:')) {
          authorData.avatar = trimmedLine.substring(7).trim();
          continue;
        }
        
        if (inAuthor && trimmedLine.startsWith('bio:')) {
          authorData.bio = trimmedLine.substring(4).trim();
          continue;
        }
        
        if (!trimmedLine.startsWith(' ')) {
          inAuthor = false;
        }
        
        const colonIndex = trimmedLine.indexOf(':');
        if (colonIndex === -1) continue;
        
        const key = trimmedLine.slice(0, colonIndex).trim();
        const value = trimmedLine.slice(colonIndex + 1).trim();
        
        switch (key) {
          case 'title':
            post.title = value;
            break;
          case 'date':
            post.publishedDate = value;
            break;
          case 'excerpt':
            post.excerpt = value;
            break;
          case 'readingTime':
            post.readingTime = value;
            break;
          case 'coverImage':
            post.coverImage = value;
            break;
          case 'featuredProductId':
            post.featuredProductId = value;
            break;
          case 'recommendedProductIds':
            if (value.startsWith('[') && value.endsWith(']')) {
              post.recommendedProductIds = value.slice(1, -1).split(',').map(id => id.trim());
            }
            break;
          case 'tags':
            if (value.startsWith('[') && value.endsWith(']')) {
              post.tags = value.slice(1, -1).split(',').map(tag => tag.trim());
            }
            break;
          case 'images':
            if (value.startsWith('[') && value.endsWith(']')) {
              post.images = value.slice(1, -1).split(',').map(img => img.trim());
            }
            break;
        }
      }
      
      post.author = authorData;
      console.log(`Successfully parsed post: ${post.title}`);
      res.json(post);
    } catch (error) {
      console.error(`Error parsing post ${slug}:`, error);
      res.status(500).json({ 
        error: 'Failed to parse post',
        message: error.message,
        slug
      });
    }
  } catch (error) {
    console.error('Failed to get post:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to get post',
      stack: error.stack
    });
  }
});

// DELETE /api/posts/:slug - Delete a blog post
app.delete('/api/posts/:slug', (req, res) => {
  try {
    const { slug } = req.params;
    const filePath = path.join(postsDir, `${slug}.md`);
    
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    unlinkSync(filePath);
    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete post' });
  }
});

// GET /api/products - Get all products
app.get('/api/products', (req, res) => {
  try {
    const { category, tag } = req.query;
    
    let filteredProducts = products;
    
    // Filter by category if provided
    if (category && typeof category === 'string') {
      filteredProducts = getProductsByCategory(category);
    }
    
    // Filter by tag if provided
    if (tag && typeof tag === 'string') {
      filteredProducts = getProductsByTag(tag);
    }
    
    res.json(filteredProducts);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get products' });
  }
});

// GET /api/products/:id - Get a specific product
app.get('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const product = getProductById(id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get product' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Return a single fallback post by slug, or null if not a fallback slug
function getFallbackPostBySlug(slug: string) {
  const posts = createFallbackPosts();
  return posts.find((p: { slug: string }) => p.slug === slug) || null;
}

// Function to create fallback posts when real posts can't be loaded
function createFallbackPosts() {
  console.log('Creating fallback posts');
  
  return [
    {
      id: 'rtx-4090-stock',
      slug: 'rtx-4090-stock',
      title: 'RTX 4090 Stock: Where to Find Them in 2023',
      publishedDate: '2023-06-15',
      author: {
        name: 'Alex Johnson',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Alex',
        bio: 'Hardware enthusiast and stock tracker for high-end GPUs'
      },
      excerpt: 'A comprehensive guide to finding NVIDIA\'s flagship RTX 4090 GPU in stock at various retailers despite ongoing shortages.',
      content: '# RTX 4090 Stock: Where to Find Them in 2023\n\nFinding NVIDIA\'s flagship RTX 4090 GPU continues to be challenging in 2023. Despite its high price point of $1,599, demand remains strong for this powerhouse graphics card, particularly among enthusiasts, content creators, and AI researchers.',
      tags: ['GPU', 'NVIDIA', 'RTX 4090', 'Stock Alerts'],
      readingTime: '8 min read',
      coverImage: 'https://images.unsplash.com/photo-1624033713319-78f1bc062757?q=80&w=1932&auto=format&fit=crop',
      featuredProductId: 'p1',
      recommendedProductIds: ['p2', 'p3', 'p9']
    },
    {
      id: 'ps5-pro-hunting-guide',
      slug: 'ps5-pro-hunting-guide',
      title: 'PS5 Pro Hunting Guide: Finding Sony\'s Elusive Console',
      publishedDate: '2023-10-20',
      author: {
        name: 'Jessica Wu',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Jessica',
        bio: 'Gaming journalist and console availability expert'
      },
      excerpt: 'A detailed guide on how to secure the PlayStation 5 Pro amid limited stock and high demand across retail channels.',
      content: '# PS5 Pro Hunting Guide: Finding Sony\'s Elusive Console\n\nThe PlayStation 5 Pro represents Sony\'s mid-generation console upgrade, offering enhanced performance, improved ray tracing, and faster load times. However, securing one remains challenging due to limited production runs and overwhelming demand.',
      tags: ['PlayStation', 'PS5 Pro', 'Gaming', 'Stock Alerts', 'Console'],
      readingTime: '7 min read',
      coverImage: 'https://images.unsplash.com/photo-1607853202273-797f1c22a38e?q=80&w=2564&auto=format&fit=crop',
      featuredProductId: 'p5',
      recommendedProductIds: ['p6', 'p7', 'p8']
    }
  ];
}

export default app; 