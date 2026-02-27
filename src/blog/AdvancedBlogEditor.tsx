import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import Layout from '../components/Layout';
import AdvancedBlockEditor from './components/AdvancedBlockEditor';
import BlockRenderer from './components/BlockRenderer';
import { BlogPost, ContentBlock } from '../types';
import { getPostBySlug, savePost } from './utils/blogUtils';
import { formatBlogPostToMarkdown } from './utils/markdownUtils';
import { ArrowLeft, Save, Eye, EyeOff } from 'lucide-react';
import logoImage from '../images/Logo.png';

const AdvancedBlogEditor: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const [post, setPost] = useState<BlogPost | null>(null);
  const [title, setTitle] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  
  // Load the post data
  useEffect(() => {
    const loadPost = async () => {
      setLoading(true);
      setError(null);
      
      try {
        if (slug && slug !== 'new') {
          // Load existing post
          const existingPost = await getPostBySlug(slug);
          
          if (!existingPost) {
            setError(`Post with slug "${slug}" not found`);
            setLoading(false);
            return;
          }
          
          setPost(existingPost);
          setTitle(existingPost.title || '');
          setCoverImage(existingPost.coverImage || '');
          setTags(existingPost.tags || []);
          
          // If the post has content blocks, use those
          if (existingPost.contentBlocks && existingPost.contentBlocks.length > 0) {
            // Make sure all blocks have an order property
            const blocksWithOrder = existingPost.contentBlocks.map((block, index) => ({
              ...block,
              order: block.order !== undefined ? block.order : index
            }));
            
            setContentBlocks(blocksWithOrder);
          } else {
            // Create default blocks from the post content
            setContentBlocks([
              {
                id: uuid(),
                type: 'title',
                content: existingPost.title || '',
                order: 0
              },
              {
                id: uuid(),
                type: 'text',
                content: existingPost.content || '',
                order: 1
              }
            ]);
          }
        } else {
          // Create a new post with default blocks
          setContentBlocks([
            {
              id: uuid(),
              type: 'title',
              content: '',
              order: 0
            },
            {
              id: uuid(),
              type: 'text',
              content: '',
              order: 1
            }
          ]);
        }
      } catch (err) {
        console.error('Error loading post:', err);
        setError('Failed to load post');
      } finally {
        setLoading(false);
      }
    };
    
    loadPost();
  }, [slug]);
  
  // Handle saving the post
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      // Find the title block
      const titleBlock = contentBlocks.find(block => block.type === 'title');
      const postTitle = titleBlock ? titleBlock.content : title;
      
      // Find the excerpt block
      const excerptBlock = contentBlocks.find(block => block.type === 'excerpt');
      const excerpt = excerptBlock ? excerptBlock.content : '';
      
      // Create the post object
      const updatedPost: BlogPost = {
        ...(post || {}),
        id: post?.id || uuid(),
        slug: post?.slug || slugify(postTitle),
        title: postTitle,
        excerpt: excerpt,
        coverImage,
        tags,
        contentBlocks,
        publishedDate: post?.publishedDate || new Date().toISOString(),
        author: post?.author || {
          name: 'Admin',
          avatar: '',
          bio: ''
        },
        readingTime: post?.readingTime || calculateReadingTime(contentBlocks),
      };
      
      // Generate markdown content from blocks
      const markdown = formatBlogPostToMarkdown(updatedPost);
      console.log('Generated markdown:', markdown);
      
      // Save the post
      const success = await savePost(updatedPost);
      
      if (success) {
        // Navigate to the post
        navigate(`/blog/${updatedPost.slug}`);
      } else {
        throw new Error('Failed to save post');
      }
    } catch (err) {
      console.error('Error saving post:', err);
      setError('Failed to save post');
    } finally {
      setSaving(false);
    }
  };
  
  // Helper function to slugify a title
  const slugify = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };
  
  // Helper function to calculate reading time
  const calculateReadingTime = (blocks: ContentBlock[]): string => {
    const wordsPerMinute = 200;
    const text = blocks
      .filter(block => ['title', 'text', 'excerpt', 'headline'].includes(block.type))
      .map(block => block.content)
      .join(' ');
    
    const words = text.split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    
    return minutes.toString();
  };
  
  // Handle tag input
  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tagInput = e.target.value;
    setTags(tagInput.split(',').map(tag => tag.trim()).filter(tag => tag !== ''));
  };
  
  // Toggle preview mode
  const togglePreview = () => {
    setPreviewMode(!previewMode);
  };
  
  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-900 pt-16 pb-20">
          <div className="max-w-4xl mx-auto px-4">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-700 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-700 rounded w-1/2 mb-12"></div>
              <div className="h-64 bg-gray-700 rounded mb-8"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="min-h-screen bg-gray-900 pt-16 pb-20">
        <div className="max-w-5xl mx-auto px-4">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center text-gray-400 hover:text-white"
            >
              <ArrowLeft size={16} className="mr-1" />
              Back
            </button>
            
            <div className="flex items-center gap-4">
              <button
                onClick={togglePreview}
                className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded flex items-center text-sm transition-colors"
              >
                {previewMode ? (
                  <>
                    <EyeOff size={16} className="mr-2" />
                    Edit
                  </>
                ) : (
                  <>
                    <Eye size={16} className="mr-2" />
                    Preview
                  </>
                )}
              </button>
              
              <button
                onClick={handleSave}
                disabled={saving}
                className={`bg-[#9ed04b] hover:bg-[#9ed04b]/90 text-gray-900 px-4 py-2 rounded flex items-center text-sm transition-colors ${
                  saving ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Save size={16} className="mr-2" />
                {saving ? 'Saving...' : 'Save Post'}
              </button>
            </div>
          </div>
          
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-white px-4 py-3 rounded mb-6">
              <p>{error}</p>
            </div>
          )}
          
          {/* Post Metadata */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Post Settings</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Cover Image URL
                </label>
                <input
                  type="text"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full bg-gray-700 text-white rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#9ed04b]"
                />
                {coverImage && (
                  <div className="mt-2 bg-gray-700 p-2 rounded">
                    <img
                      src={coverImage}
                      alt="Cover"
                      className="max-h-32 object-contain mx-auto"
                      onError={(e) => {
                        e.currentTarget.src = logoImage;
                      }}
                    />
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={tags.join(', ')}
                  onChange={handleTagsChange}
                  placeholder="tag1, tag2, tag3"
                  className="w-full bg-gray-700 text-white rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#9ed04b]"
                />
                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <span
                        key={tag}
                        className="bg-gray-700 text-gray-300 px-2 py-1 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Content Editor or Preview */}
          {previewMode ? (
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Preview</h2>
              <div className="prose prose-invert prose-lg max-w-none">
                <BlockRenderer blocks={contentBlocks} />
              </div>
            </div>
          ) : (
            <AdvancedBlockEditor
              blocks={contentBlocks}
              onChange={setContentBlocks}
              onPreview={togglePreview}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AdvancedBlogEditor;
