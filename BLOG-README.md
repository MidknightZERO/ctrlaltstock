# Blog System Documentation

This blog system is designed to work as a fully static site on Netlify, while still providing a convenient local editor for content creation.

## Overview

The blog system uses:
1. **Markdown files** stored in `src/blog/posts/` for content
2. **Static build process** that converts markdown to JSON at build time 
3. **React components** that read from the static JSON file
4. **Local editor** for creating and editing posts (development only)

## How It Works

### For Development

1. Run `npm run dev:full` to start both the Vite development server and the Express API server
2. The blog editor is available at `/blog-editor` 
3. You can create, edit, and preview markdown files locally
4. Changes are stored as `.md` files in `src/blog/posts/`

### For Production / Netlify

1. Run `npm run build` to build the site
   - This first runs `npm run build:blog` to process all markdown files
   - The script generates a `public/blog-posts.json` file with all blog data
   - The Vite build then creates the static site
2. Deploy the `dist` folder to Netlify

## Creating New Blog Posts

### Method 1: Use the Local Editor

1. Start the dev server: `npm run dev:full`
2. Navigate to `/blog-editor`
3. Create a new post with the "New Post" button
4. Fill out the details and write your content
5. Save the post, which creates a markdown file in `src/blog/posts/`

### Method 2: Create Markdown Files Directly

1. Create a new `.md` file in `src/blog/posts/`
2. Add the following frontmatter structure:

```markdown
---
title: Your Post Title
date: 2023-06-15
author:
  name: Your Name
  avatar: https://example.com/avatar.jpg
  bio: Short author bio
excerpt: A brief excerpt of your post
tags: [Tag1, Tag2, Tag3]
featuredProductId: p1
recommendedProductIds: [p2, p3]
readingTime: 5 min read
coverImage: https://example.com/cover.jpg
images: [https://example.com/image1.jpg, https://example.com/image2.jpg]
---

# Your Markdown Content Goes Here

This is the body of your blog post. You can use all standard Markdown syntax.
```

## How The Static Build Process Works

1. The `scripts/build-blog.js` script:
   - Reads all markdown files from `src/blog/posts/`
   - Parses the frontmatter and content using gray-matter
   - Generates a JSON array of blog post objects
   - Writes to `public/blog-posts.json`

2. The React components:
   - `BlogHome.tsx` and `BlogPost.tsx` load data from `/blog-posts.json`
   - This approach works perfectly with static site hosting like Netlify
   - No server-side processing is needed

## File Structure

- `src/blog/posts/*.md` - Your blog content files
- `scripts/build-blog.js` - The static site generator script
- `src/blog/utils/markdownUtils.ts` - Utilities for parsing markdown
- `src/blog/BlogHome.tsx` - The blog listing page
- `src/blog/BlogPost.tsx` - The individual blog post page
- `src/blog/LocalEditor.tsx` - The local blog editor (dev only)

## Customization

To customize the blog system:

1. **Layout**: Edit the components in `src/blog/BlogHome.tsx` and `src/blog/BlogPost.tsx`
2. **Styling**: The components use Tailwind CSS classes
3. **Markdown Rendering**: Update `src/blog/components/MarkdownRenderer.tsx` to change how markdown is rendered

## Troubleshooting

If your blog posts aren't appearing:

1. Check that your markdown files are properly formatted
2. Run `npm run build:blog` to generate the JSON file
3. Check the console for any errors during build
4. Verify that the `public/blog-posts.json` file exists and contains your posts

## Benefits of This Approach

- **100% Static**: All content is pre-built, making the site extremely fast
- **Netlify Compatible**: Works perfectly with Netlify's static hosting
- **SEO Friendly**: All content is included in the HTML
- **Developer Experience**: Easy local editing and preview
- **Version Control**: All blog content is in Git as markdown files 