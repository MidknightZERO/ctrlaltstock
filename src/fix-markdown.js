import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory containing markdown files
const postsDir = path.join(__dirname, 'blog', 'posts');

// Function to fix a single markdown file
function fixMarkdownFile(filePath) {
  console.log(`Fixing file: ${filePath}`);
  
  try {
    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extract frontmatter and content
    const frontMatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontMatterRegex);
    
    if (!match) {
      console.error(`Invalid markdown format in file: ${filePath}`);
      return;
    }
    
    const [, frontMatter, markdownContent] = match;
    
    // Parse frontmatter into an object
    const frontMatterLines = frontMatter.split('\n');
    const frontMatterData = {};
    let currentKey = null;
    let inAuthor = false;
    let authorData = {};
    
    for (const line of frontMatterLines) {
      const trimmedLine = line.trim();
      if (trimmedLine === '') continue;
      
      if (trimmedLine.startsWith('author:')) {
        inAuthor = true;
        frontMatterData.author = {};
        continue;
      }
      
      if (inAuthor && trimmedLine.startsWith('name:')) {
        frontMatterData.author.name = trimmedLine.substring(5).trim();
        continue;
      }
      
      if (inAuthor && trimmedLine.startsWith('avatar:')) {
        frontMatterData.author.avatar = trimmedLine.substring(7).trim();
        continue;
      }
      
      if (inAuthor && trimmedLine.startsWith('bio:')) {
        frontMatterData.author.bio = trimmedLine.substring(4).trim();
        continue;
      }
      
      if (!trimmedLine.startsWith(' ')) {
        inAuthor = false;
      }
      
      if (!inAuthor) {
        const colonIndex = trimmedLine.indexOf(':');
        if (colonIndex === -1) continue;
        
        const key = trimmedLine.slice(0, colonIndex).trim();
        const value = trimmedLine.slice(colonIndex + 1).trim();
        
        if (key === 'tags' || key === 'recommendedProductIds' || key === 'images') {
          if (value.startsWith('[') && value.endsWith(']')) {
            const items = value.slice(1, -1).split(',').map(item => item.trim());
            frontMatterData[key] = items.map(item => `"${item}"`);
          }
        } else {
          frontMatterData[key] = value;
        }
      }
    }
    
    // Create new frontmatter
    let newFrontMatter = '---\n';
    
    // Add title, date, and other simple fields
    if (frontMatterData.title) newFrontMatter += `title: ${frontMatterData.title}\n`;
    if (frontMatterData.date) newFrontMatter += `date: ${frontMatterData.date}\n`;
    
    // Add author with correct indentation
    if (frontMatterData.author) {
      newFrontMatter += 'author:\n';
      if (frontMatterData.author.name) newFrontMatter += `  name: ${frontMatterData.author.name}\n`;
      if (frontMatterData.author.avatar) newFrontMatter += `  avatar: ${frontMatterData.author.avatar}\n`;
      if (frontMatterData.author.bio) newFrontMatter += `  bio: ${frontMatterData.author.bio}\n`;
    }
    
    // Add excerpt
    if (frontMatterData.excerpt) newFrontMatter += `excerpt: ${frontMatterData.excerpt}\n`;
    
    // Add tags
    if (frontMatterData.tags) {
      newFrontMatter += `tags: [${frontMatterData.tags.join(', ')}]\n`;
    }
    
    // Add featuredProductId
    if (frontMatterData.featuredProductId) {
      newFrontMatter += `featuredProductId: ${frontMatterData.featuredProductId}\n`;
    }
    
    // Add recommendedProductIds
    if (frontMatterData.recommendedProductIds) {
      newFrontMatter += `recommendedProductIds: [${frontMatterData.recommendedProductIds.join(', ')}]\n`;
    }
    
    // Add readingTime
    if (frontMatterData.readingTime) {
      newFrontMatter += `readingTime: ${frontMatterData.readingTime}\n`;
    }
    
    // Add coverImage
    if (frontMatterData.coverImage) {
      newFrontMatter += `coverImage: ${frontMatterData.coverImage}\n`;
    }
    
    // Add images
    if (frontMatterData.images) {
      newFrontMatter += `images: [${frontMatterData.images.join(', ')}]\n`;
    }
    
    newFrontMatter += '---\n\n';
    
    // Create the new file content
    const newContent = newFrontMatter + markdownContent;
    
    // Write the fixed content back to the file
    fs.writeFileSync(filePath, newContent, 'utf8');
    
    console.log(`Successfully fixed file: ${filePath}`);
  } catch (error) {
    console.error(`Error fixing file ${filePath}:`, error);
  }
}

// Get all markdown files
const files = fs.readdirSync(postsDir).filter(file => file.endsWith('.md'));

console.log(`Found ${files.length} markdown files to fix`);

// Fix each file
for (const file of files) {
  const filePath = path.join(postsDir, file);
  fixMarkdownFile(filePath);
}

console.log('Done fixing markdown files!'); 