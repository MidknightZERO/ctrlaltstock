import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { execFile } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

const BLOG_API_KEY = process.env.BLOG_API_KEY;
if (!BLOG_API_KEY) {
  console.error('FATAL: BLOG_API_KEY environment variable is not set');
  process.exit(1);
}

app.use(cors({
  origin: ['http://localhost:5173', 'https://ctrlaltstock.com']
}));
app.use(express.json({ limit: '50mb' }));

const POSTS_DIR = path.join(__dirname, 'src', 'blog', 'posts');

if (!existsSync(POSTS_DIR)) {
  mkdirSync(POSTS_DIR, { recursive: true });
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function isValidSlug(slug) {
  return typeof slug === 'string' && slug.length > 0 && slug.length <= 200 && SLUG_PATTERN.test(slug);
}

function requireAuth(req, res, next) {
  const provided = req.headers.authorization?.replace('Bearer ', '');
  if (provided !== BLOG_API_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 30;

function rateLimit(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return next();
  }
  record.count++;
  if (record.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  next();
}

app.use(rateLimit);

function runBuildBlog() {
  execFile('npm', ['run', 'build:blog'], { shell: true }, (error, stdout, stderr) => {
    if (error) console.error('build:blog failed:', error.message);
    if (stderr) console.error('build:blog stderr:', stderr);
    console.log('build:blog output:', stdout);
  });
}

app.post('/api/posts', requireAuth, async (req, res) => {
  try {
    const { post } = req.body;

    if (!post || !post.title || !post.content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const slug = post.slug || post.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    if (!isValidSlug(slug)) {
      return res.status(400).json({ error: 'Invalid slug' });
    }

    const filePath = path.join(POSTS_DIR, `${slug}.md`);

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

    if (post.contentBlocks && post.contentBlocks.length > 0) {
      frontMatter.contentBlocks = post.contentBlocks;
    }

    const markdown = matter.stringify(post.content, frontMatter);

    await fs.writeFile(filePath, markdown, 'utf8');

    runBuildBlog();

    res.json({
      success: true,
      message: 'Post saved successfully',
      slug
    });
  } catch (error) {
    console.error('Error saving post:', error);
    res.status(500).json({ error: 'Failed to save post' });
  }
});

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

    // Newest first (same as build script and frontend)
    posts.sort((a, b) => {
      const ta = new Date(a.publishedDate || 0).getTime();
      const tb = new Date(b.publishedDate || 0).getTime();
      return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
    });

    res.json(posts);
  } catch (error) {
    console.error('Error getting posts:', error);
    res.status(500).json({ error: 'Failed to get posts' });
  }
});

app.get('/api/posts/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    if (!isValidSlug(slug)) {
      return res.status(400).json({ error: 'Invalid slug' });
    }

    const filePath = path.join(POSTS_DIR, `${slug}.md`);

    if (!existsSync(filePath)) {
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

app.get('/api/trivia', async (req, res) => {
  try {
    const { category, amount = '10', token, difficulty, type = 'multiple' } = req.query;
    const params = new URLSearchParams({
      amount: String(amount),
      category: String(category || '9'),
      type: String(type),
    });
    if (difficulty) params.set('difficulty', String(difficulty));
    if (token) params.set('token', String(token));

    const opentdbUrl = `https://opentdb.com/api.php?${params}`;
    const fetchRes = await fetch(opentdbUrl);
    const data = await fetchRes.json();
    res.json(data);
  } catch (error) {
    console.error('Error proxying trivia:', error);
    res.status(500).json({ response_code: -1, results: [] });
  }
});

app.get('/api/trivia-token', async (req, res) => {
  try {
    const { command = 'request', token } = req.query;
    const url = command === 'reset' && token
      ? `https://opentdb.com/api_token.php?command=reset&token=${token}`
      : 'https://opentdb.com/api_token.php?command=request';
    const fetchRes = await fetch(url);
    const data = await fetchRes.json();
    res.json(data);
  } catch (error) {
    console.error('Error proxying trivia token:', error);
    res.status(500).json({});
  }
});

app.delete('/api/posts/:slug', requireAuth, async (req, res) => {
  try {
    const { slug } = req.params;

    if (!isValidSlug(slug)) {
      return res.status(400).json({ error: 'Invalid slug' });
    }

    const filePath = path.join(POSTS_DIR, `${slug}.md`);

    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await fs.unlink(filePath);

    runBuildBlog();

    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
