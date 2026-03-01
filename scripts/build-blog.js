// This is a build script that processes all markdown files in the src/blog/posts directory
// and generates a static JSON file that can be used by the blog components

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path constants
const POSTS_DIR = path.join(path.resolve(__dirname, '..'), 'src', 'blog', 'posts');
const OUTPUT_DIR = path.join(path.resolve(__dirname, '..'), 'public');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'blog-posts.json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('Starting blog build process...');
console.log(`Reading posts from: ${POSTS_DIR}`);

// Get all markdown files
const getMarkdownFiles = () => {
  if (!fs.existsSync(POSTS_DIR)) {
    console.error(`Posts directory does not exist: ${POSTS_DIR}`);
    return [];
  }

  return fs.readdirSync(POSTS_DIR)
    .filter(filename => filename.endsWith('.md'))
    .map(filename => ({
      filename,
      filepath: path.join(POSTS_DIR, filename)
    }));
};

// Normalize coverImage: if it looks like a srcset (e.g. "url1 208w, url2 416w"), use first URL only
const normalizeCoverImage = (raw) => {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (s.includes(',') && (/\s+\d+w\s*$/m.test(s) || s.includes(' '))) {
    const first = s.split(',')[0].trim().replace(/\s+\d+w\s*$/, '').trim();
    return first || s;
  }
  return s;
};

// Process content blocks from the markdown content
const processContentBlocks = (markdownContent) => {
  const contentBlocks = [];
  const sections = markdownContent.split(/^#+\s+.+$/m);
  const headings = markdownContent.match(/^#+\s+.+$/gm) || [];

  if (sections[0].trim() === '') {
    sections.shift();
  }

  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const content = sections[i] ? sections[i].trim() : '';
    contentBlocks.push({
      type: 'text',
      id: `block-${i}`,
      order: i,
      content: `${heading}\n\n${content}`
    });
  }

  if (sections.length > headings.length) {
    for (let i = headings.length; i < sections.length; i++) {
      const content = sections[i].trim();
      if (content) {
        contentBlocks.push({
          type: 'text',
          id: `block-${i}`,
          order: i,
          content
        });
      }
    }
  }

  return contentBlocks;
};

// Parse markdown file to blog post object
const parseMarkdownFile = (filepath, filename) => {
  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    const { data: frontMatter, content: markdownContent } = matter(content);
    const slug = filename.replace(/\.md$/, '');

    // Process author information
    const author = {
      name: '',
      avatar: '',
      bio: ''
    };

    if (frontMatter.author) {
      if (typeof frontMatter.author === 'object') {
        author.name = frontMatter.author.name || '';
        author.avatar = frontMatter.author.avatar || '';
        author.bio = frontMatter.author.bio || '';
      } else {
        author.name = String(frontMatter.author);
      }
    }
    // Default team author when name/avatar missing (06-06)
    if (!author.name || !author.avatar) {
      author.name = author.name || 'CtrlAltStock';
      author.avatar = author.avatar || '/Logo.png';
      author.bio = author.bio || 'Community-run stock alerts and hardware news';
    }

    // Process tags (ensure it's an array)
    let tags = [];
    if (frontMatter.tags) {
      if (Array.isArray(frontMatter.tags)) {
        tags = frontMatter.tags;
      } else if (typeof frontMatter.tags === 'string') {
        // Handle string format like "[tag1, tag2]" or "tag1, tag2"
        const tagsStr = frontMatter.tags.replace(/^\[|\]$/g, '');
        tags = tagsStr.split(',').map(tag => tag.trim());
      }
    }

    // Process images (ensure it's an array)
    let images = [];
    if (frontMatter.images) {
      if (Array.isArray(frontMatter.images)) {
        images = frontMatter.images;
      } else if (typeof frontMatter.images === 'string') {
        const imagesStr = frontMatter.images.replace(/^\[|\]$/g, '');
        images = imagesStr.split(',').map(img => img.trim());
      }
    }

    // Process recommended product IDs (ensure it's an array)
    let recommendedProductIds = [];
    if (frontMatter.recommendedProductIds) {
      if (Array.isArray(frontMatter.recommendedProductIds)) {
        recommendedProductIds = frontMatter.recommendedProductIds;
      } else if (typeof frontMatter.recommendedProductIds === 'string') {
        const idsStr = frontMatter.recommendedProductIds.replace(/^\[|\]$/g, '');
        recommendedProductIds = idsStr.split(',').map(id => id.trim());
      }
    }

    // Process content blocks if provided, or generate from content
    let contentBlocks = frontMatter.contentBlocks || [];

    // If no content blocks are defined in frontmatter, generate them from the markdown content
    if (!contentBlocks.length) {
      contentBlocks = processContentBlocks(markdownContent);
    }

    // Process amazonProducts (auto-generated by bot/amazon_linker.py)
    let amazonProducts = [];
    if (Array.isArray(frontMatter.amazonProducts)) {
      amazonProducts = frontMatter.amazonProducts;
    }

    // Process relatedPostSlugs (auto-generated by bot/ai_editor.py)
    let relatedPostSlugs = [];
    if (Array.isArray(frontMatter.relatedPostSlugs)) {
      relatedPostSlugs = frontMatter.relatedPostSlugs;
    } else if (typeof frontMatter.relatedPostSlugs === 'string') {
      relatedPostSlugs = frontMatter.relatedPostSlugs
        .replace(/^\[|\]$/g, '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    }

    return {
      id: slug,
      slug,
      title: String(frontMatter.title || ''),
      publishedDate: (() => {
        const d = String(frontMatter.date || ''),
          fallback = '1970-01-01';
        if (!d || isNaN(new Date(d).getTime())) {
          console.warn(`Warning: ${filename} has missing or invalid date, using ${fallback}`);
          return fallback;
        }
        return d;
      })(),
      content: markdownContent.trim(),
      excerpt: String(frontMatter.excerpt || ''),
      readingTime: String(frontMatter.readingTime || ''),
      coverImage: normalizeCoverImage(frontMatter.coverImage),
      tags,
      images,
      featuredProductId: frontMatter.featuredProductId ? String(frontMatter.featuredProductId) : '',
      recommendedProductIds,
      contentBlocks,
      author,
      amazonProducts,
      relatedPostSlugs,
      autoGenerated: frontMatter.autoGenerated === true,
      sourceUrl: String(frontMatter.sourceUrl || ''),
    };
  } catch (error) {
    console.error(`Error parsing markdown file: ${filepath}`, error);
    return null;
  }
};

// Process all markdown files
const buildBlog = () => {
  const files = getMarkdownFiles();
  console.log(`Found ${files.length} markdown files`);

  const posts = files
    .map(({ filepath, filename }) => parseMarkdownFile(filepath, filename))
    .filter(Boolean) // Remove null entries
    .sort((a, b) => {
      // Sort by date (newest first); secondary sort by slug when dates equal for deterministic order
      const ta = new Date(a.publishedDate || '1970-01-01').getTime();
      const tb = new Date(b.publishedDate || '1970-01-01').getTime();
      if (tb !== ta) return tb - ta;
      return (a.slug || '').localeCompare(b.slug || '');
    });

  console.log(`Successfully parsed ${posts.length} blog posts`);

  // Write the JSON file (atomic: write to temp, then rename)
  const tmpFile = OUTPUT_FILE + '.tmp';
  fs.writeFileSync(tmpFile, JSON.stringify(posts, null, 2));
  fs.renameSync(tmpFile, OUTPUT_FILE);
  console.log(`Blog posts written to: ${OUTPUT_FILE}`);
};

try {
  buildBlog();
  console.log('Blog build completed successfully!');
} catch (error) {
  console.error('Blog build failed:', error);
  process.exit(1);
} 