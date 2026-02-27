# Ctrl, Alt, Stock Blog

A modern, feature-rich blog implementation for the Ctrl, Alt, Stock website. This blog system includes a sophisticated frontend with a local content management interface.

## Features

### Blog Frontend
- 🎨 **Modern Design**: Clean, responsive layout with micro-animations for enhanced user experience
- 📱 **Fully Responsive**: Optimized for all screen sizes (mobile, tablet, desktop)
- 🔖 **Tag System**: Robust tagging for categorization and filtering of content
- 🔍 **Search Functionality**: Full-text search across all blog content
- 📊 **Data Visualization**: Support for bar, line, and pie charts using Chart.js
- 📑 **Comparison Tables**: Beautiful tables for comparing products or features
- 💰 **Affiliate Integration**: Product recommendation sections with affiliate links
- 🖼️ **Rich Media Support**: Header images, in-content images, and optimized image loading

### Local Content Management
- ✏️ **Post Editor**: Create and edit blog posts with a user-friendly interface
- 👁️ **Live Preview**: Real-time preview of markdown content
- 🏷️ **Tag Management**: Add, remove, and manage post tags
- 📁 **Image Management**: Add and manage images for blog posts
- 💾 **Import/Export**: Save and load blog content as JSON files
- 📝 **Markdown Support**: Write content using Markdown with real-time preview

## Technologies Used

- **React**: Frontend UI library
- **TypeScript**: Type-safe JavaScript
- **React Router**: For navigation and routing
- **TailwindCSS**: Utility-first CSS framework for styling
- **Chart.js**: Data visualization library
- **React Markdown**: Markdown rendering component
- **Lucide React**: Icon components
- **Vite**: Build tool and development server

## Getting Started

### Prerequisites
- Node.js (v16+)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ctrlaltstock.git
cd ctrlaltstock
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server and API server:

   Option 1: Use the combined script to start both servers at once:
   ```
   npm run dev:full
   ```

   Option 2: Start servers separately in different terminal windows:

   Terminal 1 (React app):
   ```
   npm run dev
   ```

   Terminal 2 (Express API server):
   ```
   npm run server
   ```

4. Open your browser and navigate to:
```
http://localhost:5173/blog
```

5. To access the local content management interface:
```
http://localhost:5173/blog-editor
```

## Usage

### Viewing the Blog
- Visit `/blog` to see all blog posts
- Click on any post to view its full content
- Use the tag filters to narrow down posts by topic
- Use the search feature to find specific content

### Managing Blog Content
- Visit `/blog-editor` to access the content management interface
- Click "New Post" to create a new blog post
- Use the editor to write and format your content with Markdown
- Add images, tags, and product recommendations
- Use the preview feature to see how your post will look
- Save your posts and export them for backup

## Deployment

To build for production:

```bash
npm run build
```

The built files will be in the `dist` directory and can be deployed to any static hosting service like Netlify, Vercel, or GitHub Pages.

## Customization

### Styling
- Colors can be customized in `tailwind.config.js`
- Component styles are applied using Tailwind utility classes

### Blog Configuration
- Blog data structure is defined in `src/blog/data/blogPosts.ts`
- Utility functions for blog operations are in `src/blog/utils/blogUtils.ts`

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Unsplash](https://unsplash.com) for placeholder images
- [DiceBear](https://dicebear.com) for avatar generation

# CtrlAltStock Blog Editor

This project includes a blog editor with the capability to save blog posts directly to the file system and update the index.ts file automatically.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file in the root directory with the following content:
   ```
   PORT=3001
   VITE_API_URL=http://localhost:3001
   ```

3. Start the development server and API server in separate terminal windows:

   Terminal 1 (React app):
   ```
   npm run dev
   ```

   Terminal 2 (Express API server):
   ```
   npm run server
   ```

## Using the Blog Editor

1. Navigate to `/blog-editor` in your browser
2. Create a new blog post or edit an existing one
3. When you click "Save Post", the post will be:
   - Saved to localStorage (for backup)
   - Saved as a TypeScript file in the `src/blog/posts` directory
   - Automatically added to the `index.ts` file to be included in the blog
4. When you click "Delete" on a post, the post will be:
   - Removed from localStorage
   - The TypeScript file will be deleted from the file system
   - The post will be automatically removed from the `index.ts` file

If the server is not running or encounters an error, the editor will offer to download the files for manual saving (during save operations), and will notify you if file deletion fails but will still remove the post from the editor.

## File Structure

- `server.js` - Express server for file operations
- `src/blog/LocalEditor.tsx` - Blog editor component
- `src/blog/posts/` - Directory where blog posts are saved
- `src/blog/posts/index.ts` - Index file that imports all blog posts

## Features

- Create, edit, and delete blog posts
- Rich markdown editor with preview
- Add and manage product recommendations
- Tag management
- Image management
- Author information management
- Automatic saving to file system
- Automatic index.ts updates