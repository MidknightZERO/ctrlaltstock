import { BlogPost } from '../../types';
import matter from 'gray-matter';

/**
 * Clean quoted strings in array values from frontmatter
 */
export function cleanQuotedValue(value: string): string {
  if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  return value;
}

/**
 * Process an array of values from frontmatter to remove quotes
 */
export function processArrayValues(arr: any[] = []): string[] {
  if (!Array.isArray(arr)) {
    return [];
  }

  return arr.map(value => {
    if (typeof value === 'string') {
      return cleanQuotedValue(value);
    }
    return String(value);
  });
}

/**
 * Parses markdown content into a BlogPost object
 * @param markdownContent The raw markdown content
 * @param slug The slug of the blog post
 * @returns A BlogPost object or null if parsing fails
 */
export function parseMarkdownToBlogPost(markdownContent: string, slug: string): BlogPost | null {
  try {
    // Parse the markdown using gray-matter
    const { data: frontMatter, content } = matter(markdownContent);

    // Log the parsed frontmatter for debugging
    console.log(`Parsing post: ${slug}`);

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

    // Process tags (ensure it's an array)
    let tags: string[] = [];
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
    let images: string[] = [];
    if (frontMatter.images) {
      if (Array.isArray(frontMatter.images)) {
        images = frontMatter.images;
      } else if (typeof frontMatter.images === 'string') {
        const imagesStr = frontMatter.images.replace(/^\[|\]$/g, '');
        images = imagesStr.split(',').map(img => img.trim());
      }
    }

    // Process recommended product IDs (ensure it's an array)
    let recommendedProductIds: string[] = [];
    if (frontMatter.recommendedProductIds) {
      if (Array.isArray(frontMatter.recommendedProductIds)) {
        recommendedProductIds = frontMatter.recommendedProductIds;
      } else if (typeof frontMatter.recommendedProductIds === 'string') {
        const idsStr = frontMatter.recommendedProductIds.replace(/^\[|\]$/g, '');
        recommendedProductIds = idsStr.split(',').map(id => id.trim());
      }
    }

    // Process content blocks
    let contentBlocks: ContentBlock[] = [];
    if (frontMatter.contentBlocks) {
      if (Array.isArray(frontMatter.contentBlocks)) {
        contentBlocks = frontMatter.contentBlocks;
      } else {
        console.warn(`Content blocks for ${slug} is not an array:`, frontMatter.contentBlocks);
      }
    } else {
      // If no content blocks are defined, try to parse the content into blocks
      contentBlocks = parseContentToBlocks(content, slug);
    }

    // Create the BlogPost object
    const post: BlogPost = {
      id: slug,
      slug: slug,
      title: String(frontMatter.title || ''),
      publishedDate: String(frontMatter.date || ''),
      content: content.trim(),
      excerpt: String(frontMatter.excerpt || ''),
      readingTime: String(frontMatter.readingTime || ''),
      coverImage: String(frontMatter.coverImage || ''),
      tags: tags,
      images: images,
      featuredProductId: frontMatter.featuredProductId ? String(frontMatter.featuredProductId) : '',
      recommendedProductIds: recommendedProductIds,
      contentBlocks: contentBlocks,
      author: author
    };

    return post;
  } catch (error) {
    console.error(`Error parsing markdown for ${slug}:`, error);
    return null;
  }
}

/**
 * Parses markdown content into content blocks
 * @param content The markdown content
 * @param slug The slug of the blog post (for generating IDs)
 * @returns An array of ContentBlock objects
 */
export function parseContentToBlocks(content: string, slug: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const lines = content.split('\n');
  let currentBlock: any = null;
  let blockOrder = 0;

  // Helper to add the current block to the blocks array
  const addCurrentBlock = () => {
    if (currentBlock) {
      blocks.push(currentBlock);
      currentBlock = null;
    }
  };

  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for heading (# Title)
    if (line.startsWith('#')) {
      addCurrentBlock();

      const level = line.match(/^#+/)[0].length;
      const content = line.replace(/^#+\s+/, '');

      if (level === 1) {
        currentBlock = {
          id: `${slug}-title-${blockOrder}`,
          type: 'title',
          content,
          order: blockOrder++
        };
      } else {
        currentBlock = {
          id: `${slug}-headline-${blockOrder}`,
          type: 'headline',
          content,
          level,
          order: blockOrder++
        };
      }

      addCurrentBlock();
    }
    // Check for divider (---)
    else if (line.trim() === '---') {
      addCurrentBlock();

      currentBlock = {
        id: `${slug}-divider-${blockOrder}`,
        type: 'divider',
        style: 'solid',
        order: blockOrder++
      };

      addCurrentBlock();
    }
    // Check for blockquote (> text)
    else if (line.startsWith('>')) {
      addCurrentBlock();

      const content = line.replace(/^>\s+/, '');
      currentBlock = {
        id: `${slug}-excerpt-${blockOrder}`,
        type: 'excerpt',
        content,
        order: blockOrder++
      };

      addCurrentBlock();
    }
    // Check for code block (```language)
    else if (line.startsWith('```')) {
      addCurrentBlock();

      const language = line.replace(/^```/, '');
      let codeContent = '';
      let j = i + 1;

      // Collect all lines until the closing ```
      while (j < lines.length && !lines[j].startsWith('```')) {
        codeContent += lines[j] + '\n';
        j++;
      }

      currentBlock = {
        id: `${slug}-snippet-${blockOrder}`,
        type: 'snippet',
        content: codeContent.trim(),
        language: language.trim() || 'javascript',
        order: blockOrder++
      };

      addCurrentBlock();
      i = j; // Skip to after the closing ```
    }
    // Check for image (![alt](url))
    else if (line.match(/!\[.*?\]\(.*?\)/)) {
      addCurrentBlock();

      const match = line.match(/!\[(.*?)\]\((.*?)\)/);
      const alt = match[1];
      const url = match[2];

      // Check if the next line is a caption (*caption*)
      let caption = '';
      if (i + 1 < lines.length && lines[i + 1].match(/^\*.*\*$/)) {
        caption = lines[i + 1].replace(/^\*(.*)\*$/, '$1');
        i++; // Skip the caption line
      }

      currentBlock = {
        id: `${slug}-image-${blockOrder}`,
        type: 'image',
        url,
        alt,
        caption,
        order: blockOrder++
      };

      addCurrentBlock();
    }
    // Check for product block (:::product)
    else if (line.startsWith(':::product')) {
      addCurrentBlock();

      let productId = '';
      let j = i + 1;

      // Get the product ID from the next line
      if (j < lines.length && !lines[j].startsWith(':::')) {
        productId = lines[j].trim();
        j++;
      }

      // Skip to after the closing :::
      while (j < lines.length && !lines[j].startsWith(':::')) {
        j++;
      }

      currentBlock = {
        id: `${slug}-product-${blockOrder}`,
        type: 'product',
        productId,
        order: blockOrder++
      };

      addCurrentBlock();
      i = j; // Skip to after the closing :::
    }
    // Regular text content
    else if (line.trim() !== '') {
      if (!currentBlock) {
        currentBlock = {
          id: `${slug}-text-${blockOrder}`,
          type: 'text',
          content: line,
          order: blockOrder++
        };
      } else if (currentBlock.type === 'text') {
        currentBlock.content += '\n' + line;
      } else {
        addCurrentBlock();
        currentBlock = {
          id: `${slug}-text-${blockOrder}`,
          type: 'text',
          content: line,
          order: blockOrder++
        };
      }
    } else if (line.trim() === '' && currentBlock && currentBlock.type === 'text') {
      // Empty line after text block - add a paragraph break
      currentBlock.content += '\n\n';
    }
  }

  // Add the last block if there is one
  addCurrentBlock();

  return blocks;
}

/**
 * Formats a blog post object into markdown content with frontmatter
 * @param post The BlogPost object
 * @returns A string containing the markdown content
 */
export function formatBlogPostToMarkdown(post: BlogPost): string {
  // Create the frontmatter object
  const frontMatter: Record<string, any> = {
    title: post.title,
    date: post.publishedDate,
    excerpt: post.excerpt,
    readingTime: post.readingTime,
    coverImage: post.coverImage,
    author: {
      name: post.author.name,
      avatar: post.author.avatar,
      bio: post.author.bio
    }
  };

  // Add optional fields if they exist
  if (post.tags && post.tags.length > 0) {
    frontMatter.tags = post.tags;
  }

  if (post.images && post.images.length > 0) {
    frontMatter.images = post.images;
  }

  if (post.featuredProductId) {
    frontMatter.featuredProductId = post.featuredProductId;
  }

  if (post.recommendedProductIds && post.recommendedProductIds.length > 0) {
    frontMatter.recommendedProductIds = post.recommendedProductIds;
  }

  // Generate content from blocks if they exist
  let content = post.content;

  if (post.contentBlocks && post.contentBlocks.length > 0) {
    // Store the blocks in the frontmatter for future editing
    frontMatter.contentBlocks = post.contentBlocks;

    // Also generate markdown content from the blocks
    content = generateMarkdownFromBlocks(post.contentBlocks);
  }

  // Create the markdown string using gray-matter
  const markdown = matter.stringify(content, frontMatter);

  return markdown;
}

/**
 * Generates markdown content from content blocks
 * @param blocks Array of ContentBlock objects
 * @returns A string containing the markdown content
 */
export function generateMarkdownFromBlocks(blocks: ContentBlock[]): string {
  // Sort blocks by order
  const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);

  // Convert each block to markdown
  const markdownParts = sortedBlocks.map(block => {
    switch (block.type) {
      case 'title':
        return `# ${block.content}\n\n`;

      case 'headline':
        const headlineBlock = block as any;
        const level = headlineBlock.level || 2;
        const hashes = '#'.repeat(level);
        return `${hashes} ${block.content}\n\n`;

      case 'text':
        return `${block.content}\n\n`;

      case 'image':
        const imageBlock = block as any;
        let imageMarkdown = `![${imageBlock.alt || ''}](${imageBlock.url})\n\n`;
        if (imageBlock.caption) {
          imageMarkdown += `*${imageBlock.caption}*\n\n`;
        }
        return imageMarkdown;

      case 'product':
        const productBlock = block as any;
        return `:::product\n${productBlock.productId}\n:::\n\n`;

      case 'divider':
        return `---\n\n`;

      case 'excerpt':
        return `> ${block.content}\n\n`;

      case 'snippet':
        const snippetBlock = block as any;
        return `\`\`\`${snippetBlock.language || 'javascript'}\n${block.content}\n\`\`\`\n\n`;

      default:
        return '';
    }
  });

  return markdownParts.join('');
}