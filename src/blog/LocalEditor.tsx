import React, { useState, useEffect, ChangeEvent, MouseEvent, FC } from 'react';
import { Link } from 'react-router-dom';
import { BlogPost, ContentBlock, TextBlock, ImageBlock, ProductBlock, Product, TitleBlock, HeadlineBlock, ExcerptBlock, DividerBlock } from '../types.d';
import { getAllPosts, savePost, deletePost } from './utils/blogUtils';
import Layout from '../components/Layout';
import MarkdownRenderer from './components/MarkdownRenderer';
import { Calendar, User, Edit, Trash, Plus, Save, Eye, ArrowLeft, AlertTriangle, Move, Copy, Trash2 } from 'lucide-react';
import { v4 as uuid } from 'uuid';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { ArrowUp, ArrowDown } from 'react-feather';
import ProductSelector from './components/ProductSelector';

interface EditableAuthor {
  name: string;
  avatar: string;
  bio: string;
}

interface EditableBlogPost extends Omit<Partial<BlogPost>, 'author'> {
  author?: EditableAuthor;
  recommendations?: Product[];
}

const BLOCK_TYPES = {
  title: 'Title',
  headline: 'Headline',
  excerpt: 'Excerpt',
  divider: 'Divider',
  text: 'Text',
  image: 'Image',
  product: 'Product'
} as const;

type BlockType = keyof typeof BLOCK_TYPES;

const createBlock = (type: string, order: number): ContentBlock => {
  const id = uuid();
  
  switch (type) {
    case 'title':
      return {
        id,
        type: 'title',
        content: '',
        order
      } as TitleBlock;
      
    case 'headline':
      return {
        id,
        type: 'headline',
        content: '',
        order
      } as HeadlineBlock;
      
    case 'excerpt':
      return {
        id,
        type: 'excerpt',
        content: '',
        order
      } as ExcerptBlock;
      
    case 'divider':
      return {
        id,
        type: 'divider',
        order
      } as DividerBlock;
      
    case 'text':
    default:
      return {
        id,
        type: 'text',
        content: '',
        order
      } as TextBlock;
  }
};

const LocalEditor: FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [currentPost, setCurrentPost] = useState<BlogPost | null>(null);
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchPosts = async () => {
      const fetchedPosts = await getAllPosts();
      setPosts(fetchedPosts);
      
      // Extract all unique tags
      const tags = new Set<string>();
      fetchedPosts.forEach(post => {
        post.tags.forEach(tag => tags.add(tag));
      });
      setAllTags(Array.from(tags));
    };
    
    fetchPosts();
  }, []);

  useEffect(() => {
    // When currentPost changes, update content blocks
    if (currentPost && currentPost.contentBlocks && currentPost.contentBlocks.length > 0) {
      setContentBlocks(currentPost.contentBlocks);
    } else if (currentPost && currentPost.content) {
      // If no content blocks but has content, create a default text block
      setContentBlocks([createInitialTextBlock(currentPost.content)]);
    } else {
      setContentBlocks([]);
    }
  }, [currentPost?.id]);

  const handleCreateNew = () => {
    const newPost: BlogPost = {
      id: uuid(),
      slug: '',
      title: '',
      excerpt: '',
      content: '',
      coverImage: '',
      publishedDate: new Date().toISOString(),
      readingTime: '0 min read',
      tags: [],
      images: [],
      contentBlocks: [],
      author: {
        name: 'Anonymous',
        avatar: '',
        bio: ''
      }
    };
    setCurrentPost(newPost);
    setContentBlocks([]);
    setIsEditing(true);
    setIsPreview(false);
  };

  const handleEditPost = (post: BlogPost) => {
    // Create a deep copy of the post to avoid direct state mutations
    const postCopy = JSON.parse(JSON.stringify(post));
    setCurrentPost(postCopy);
    
    // Initialize content blocks from the post
    if (post.contentBlocks && post.contentBlocks.length > 0) {
      setContentBlocks(post.contentBlocks);
    } else {
      // If no content blocks, create one from the post content
      setContentBlocks([createInitialTextBlock(post.content || '')]);
    }
    
    setIsEditing(true);
    setIsPreview(false);
  };

  const handleDeletePost = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      const postToDelete = posts.find(post => post.id === id);
      
      if (!postToDelete || !postToDelete.slug) {
        alert('Error: Could not find post to delete');
        return;
      }
      
      try {
        const success = await deletePost(postToDelete.slug);
        
        if (success) {
          // Remove from local state
          const newPosts = posts.filter(post => post.id !== id);
          setPosts(newPosts);
          
          // Show success message
          const toast = document.createElement('div');
          toast.className = 'fixed bottom-4 right-4 bg-[#9ed04b] text-gray-900 px-6 py-3 rounded-lg shadow-lg z-50';
          toast.innerHTML = 'Post deleted successfully!';
          document.body.appendChild(toast);
          
          setTimeout(() => {
            toast.remove();
          }, 3000);
          
          setIsEditing(false);
          setCurrentPost(null);
        } else {
          throw new Error('Failed to delete post');
        }
      } catch (error) {
        console.error('Error deleting post:', error);
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        toast.innerHTML = 'Error deleting post. Please try again.';
        document.body.appendChild(toast);
        
        setTimeout(() => {
          toast.remove();
        }, 3000);
      }
    }
  };

  const handleSavePost = async () => {
    if (currentPost && currentPost.title) {
      setIsSaving(true);
      
      try {
        const slug = currentPost.slug || currentPost.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
          
        // Ensure all required fields are present
        const author = {
          name: currentPost.author?.name || 'Anonymous',
          avatar: currentPost.author?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=Anonymous',
          bio: currentPost.author?.bio || 'No bio available'
        };
        
        // Generate combined content from all text blocks for backward compatibility
        const combinedContent = contentBlocks
          .filter(block => block.type === 'text')
          .map(block => (block as TextBlock).content)
          .join('\n\n');
        
        const completePost: BlogPost = {
          ...currentPost,
          id: currentPost.id || uuid(),
          slug,
          author,
          content: combinedContent,
          contentBlocks: contentBlocks,
          tags: currentPost.tags || [],
          images: currentPost.images || [],
          readingTime: currentPost.readingTime || '5 min read',
          publishedDate: currentPost.publishedDate || new Date().toISOString()
        };
        
        const success = await savePost(completePost);
        
        if (success) {
          // Refresh the posts list
          const updatedPosts = await getAllPosts();
          setPosts(updatedPosts);
          
          // Show success message
          const toast = document.createElement('div');
          toast.className = 'fixed bottom-4 right-4 bg-[#9ed04b] text-gray-900 px-6 py-3 rounded-lg shadow-lg z-50';
          toast.innerHTML = 'Post saved successfully!';
          document.body.appendChild(toast);
          
          setTimeout(() => {
            toast.remove();
          }, 3000);
          
          setIsEditing(false);
          setCurrentPost(null);
          setIsDirty(false);
        } else {
          throw new Error('Failed to save post');
        }
      } catch (error) {
        console.error('Error saving post:', error);
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        toast.innerHTML = 'Error saving post. Please try again.';
        document.body.appendChild(toast);
        
        setTimeout(() => {
          toast.remove();
        }, 3000);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleAddTag = () => {
    if (newTag && currentPost) {
      if (!currentPost.tags?.includes(newTag)) {
        setCurrentPost({
          ...currentPost,
          tags: [...(currentPost.tags || []), newTag]
        });
        
        if (!allTags.includes(newTag)) {
          setAllTags([...allTags, newTag]);
        }
      }
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    if (currentPost && currentPost.tags) {
      setCurrentPost({
        ...currentPost,
        tags: currentPost.tags.filter(t => t !== tag)
      });
    }
  };

  const handleAddImage = (url: string, alt: string = '', caption: string = '') => {
    const newBlock: ImageBlock = {
      id: uuid(),
      type: 'image',
      url,
      alt,
      caption,
      order: contentBlocks.length
    };
    setContentBlocks([...contentBlocks, newBlock]);
    setIsDirty(true);
  };

  const handleRemoveImage = (index: number) => {
    if (currentPost && currentPost.images) {
      const newImages = [...currentPost.images];
      newImages.splice(index, 1);
      setCurrentPost({
        ...currentPost,
        images: newImages
      });
    }
  };

  // Function to update author information
  const handleAuthorChange = (field: keyof EditableAuthor, value: string) => {
    if (currentPost) {
      setCurrentPost({
        ...currentPost,
        author: {
          ...currentPost.author || { name: '', avatar: '', bio: '' },
          [field]: value
        }
      });
    }
  };

  // Export posts data
  const handleExportPosts = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(posts, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "blogPosts.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // Import posts data
  const handleImportPosts = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.readAsText(file, 'UTF-8');
        reader.onload = async (readerEvent) => {
          try {
            const content = readerEvent.target?.result as string;
            const parsedData = JSON.parse(content);
            
            // Save each imported post individually
            for (const post of parsedData) {
              await savePost(post);
            }
            
            // Refresh the posts list
            const updatedPosts = await getAllPosts();
            setPosts(updatedPosts);
            
            // Show success message
            const toast = document.createElement('div');
            toast.className = 'fixed bottom-4 right-4 bg-[#9ed04b] text-gray-900 px-6 py-3 rounded-lg shadow-lg z-50';
            toast.innerHTML = 'Posts imported successfully!';
            document.body.appendChild(toast);
            
            setTimeout(() => {
              toast.remove();
            }, 3000);
          } catch (error) {
            console.error('Error importing posts:', error);
            const toast = document.createElement('div');
            toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
            toast.innerHTML = 'Error importing posts. Please try again.';
            document.body.appendChild(toast);
            
            setTimeout(() => {
              toast.remove();
            }, 3000);
          }
        };
      }
    };
    input.click();
  };

  // Content block management
  const handleAddBlock = (type: string) => {
    const newBlock = createBlock(type, contentBlocks.length);
    setContentBlocks([...contentBlocks, newBlock]);
    setIsDirty(true);
  };

  const handleAddProductBlock = () => {
    const newBlock: ContentBlock = {
      id: uuid(),
      type: 'product',
      order: contentBlocks.length,
      productId: '',
      productName: '',
      description: '',
      imageUrl: ''
    };
    setContentBlocks([...contentBlocks, newBlock]);
  };

  const handleProductSelect = (blockId: string, product: Product) => {
    setContentBlocks(prevBlocks =>
      prevBlocks.map(block => {
        if (block.id === blockId) {
          return {
            ...block,
            productId: product.id,
            productName: product.name,
            description: product.description,
            imageUrl: product.imageUrl
          };
        }
        return block;
      })
    );
  };

  const handleUpdateBlock = (index: number, updatedBlock: ContentBlock) => {
    const updatedBlocks = [...contentBlocks];
    updatedBlocks[index] = updatedBlock;
    setContentBlocks(updatedBlocks);
  };

  const handleRemoveBlock = (index: number) => {
    if (contentBlocks.length <= 1) {
      alert('You must have at least one content block');
      return;
    }
    
    if (window.confirm('Are you sure you want to remove this block?')) {
      const updatedBlocks = contentBlocks.filter((_, i) => i !== index);
      setContentBlocks(updatedBlocks);
      setSelectedBlockIndex(null);
    }
  };

  const handleMoveBlockUp = (index: number) => {
    if (index <= 0) return;
    
    const updatedBlocks = [...contentBlocks];
    const temp = updatedBlocks[index];
    updatedBlocks[index] = updatedBlocks[index - 1];
    updatedBlocks[index - 1] = temp;
    
    setContentBlocks(updatedBlocks);
    setSelectedBlockIndex(index - 1);
  };

  const handleMoveBlockDown = (index: number) => {
    if (index >= contentBlocks.length - 1) return;
    
    const updatedBlocks = [...contentBlocks];
    const temp = updatedBlocks[index];
    updatedBlocks[index] = updatedBlocks[index + 1];
    updatedBlocks[index + 1] = temp;
    
    setContentBlocks(updatedBlocks);
    setSelectedBlockIndex(index + 1);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(contentBlocks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setContentBlocks(items);
    setSelectedBlockIndex(result.destination.index);
  };

  // Render a text block editor
  const renderTextBlockEditor = (block: TextBlock, index: number) => {
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <span className="bg-gray-700 text-white px-2 py-1 rounded text-xs mr-2">TEXT</span>
            <span className="text-sm text-gray-400">Block {index + 1}</span>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => handleMoveBlockUp(index)}
              disabled={index === 0}
              className={`p-1 rounded ${index === 0 ? 'text-gray-600' : 'text-gray-400 hover:bg-gray-700'}`}
              title="Move up"
            >
              <ArrowUp size={16} />
            </button>
            <button 
              onClick={() => handleMoveBlockDown(index)}
              disabled={index === contentBlocks.length - 1}
              className={`p-1 rounded ${index === contentBlocks.length - 1 ? 'text-gray-600' : 'text-gray-400 hover:bg-gray-700'}`}
              title="Move down"
            >
              <ArrowDown size={16} />
            </button>
            <button 
              onClick={() => handleRemoveBlock(index)}
              className="p-1 rounded text-red-400 hover:bg-gray-700"
              title="Remove block"
            >
              <Trash size={16} />
            </button>
          </div>
        </div>
        <textarea
          value={block.content}
          onChange={(e) => handleUpdateBlock(index, { ...block, content: e.target.value })}
          className="w-full h-64 p-3 rounded bg-gray-800 text-white border border-gray-700 focus:border-[#9ed04b] focus:ring-1 focus:ring-[#9ed04b] focus:outline-none resize-y"
          placeholder="Write your markdown content here..."
        />
        {block.content && (
          <div className="mt-2">
            <div className="text-sm text-gray-400 mb-1">Preview:</div>
            <div className="p-3 bg-gray-800 rounded border border-gray-700 prose prose-invert prose-sm max-w-none">
              <MarkdownRenderer content={block.content} />
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render an image block editor
  const renderImageBlockEditor = (block: ImageBlock, index: number) => {
    return (
      <div className="mb-4 p-4 border border-gray-700 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs mr-2">IMAGE</span>
            <span className="text-sm text-gray-400">Block {index + 1}</span>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => handleMoveBlockUp(index)}
              disabled={index === 0}
              className={`p-1 rounded ${index === 0 ? 'text-gray-600' : 'text-gray-400 hover:bg-gray-700'}`}
              title="Move up"
            >
              <ArrowUp size={16} />
            </button>
            <button 
              onClick={() => handleMoveBlockDown(index)}
              disabled={index === contentBlocks.length - 1}
              className={`p-1 rounded ${index === contentBlocks.length - 1 ? 'text-gray-600' : 'text-gray-400 hover:bg-gray-700'}`}
              title="Move down"
            >
              <ArrowDown size={16} />
            </button>
            <button 
              onClick={() => handleRemoveBlock(index)}
              className="p-1 rounded text-red-400 hover:bg-gray-700"
              title="Remove block"
            >
              <Trash size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">Image URL</label>
              <input
                type="text"
                value={block.url}
                onChange={(e) => handleUpdateBlock(index, { ...block, url: e.target.value })}
                className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 focus:border-[#9ed04b] focus:ring-1 focus:ring-[#9ed04b] focus:outline-none"
                placeholder="https://example.com/image.jpg"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">Alt Text</label>
              <input
                type="text"
                value={block.alt || ''}
                onChange={(e) => handleUpdateBlock(index, { ...block, alt: e.target.value })}
                className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 focus:border-[#9ed04b] focus:ring-1 focus:ring-[#9ed04b] focus:outline-none"
                placeholder="Description of the image"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">Caption (optional)</label>
              <input
                type="text"
                value={block.caption || ''}
                onChange={(e) => handleUpdateBlock(index, { ...block, caption: e.target.value })}
                className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 focus:border-[#9ed04b] focus:ring-1 focus:ring-[#9ed04b] focus:outline-none"
                placeholder="Image caption"
              />
            </div>
          </div>
          
          <div>
            {block.url && (
              <div>
                <div className="text-sm text-gray-400 mb-1">Preview:</div>
                <div className="border border-gray-700 rounded overflow-hidden bg-gray-800 h-48 flex items-center justify-center">
                  <img 
                    src={block.url} 
                    alt={block.alt || 'Preview'} 
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Image+Error';
                    }}
                  />
                </div>
                {block.caption && (
                  <div className="text-center text-sm text-gray-400 mt-1">{block.caption}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render a product block editor
  const renderProductBlockEditor = (block: ProductBlock, index: number) => {
    return (
      <div className="relative bg-gray-800 rounded-lg p-6 my-4">
        <div className="absolute top-4 right-4 flex space-x-2">
          <button
            onClick={() => handleRemoveBlock(index)}
            className="bg-red-600/20 hover:bg-red-600/30 text-red-500 p-2 rounded"
          >
            <Trash2 size={16} />
          </button>
        </div>
        
        <h3 className="text-lg font-semibold mb-4">Product Block</h3>
        <ProductSelector
          selectedProductId={block.productId}
          onProductSelect={(product) => handleProductSelect(block.id, product)}
        />
      </div>
    );
  };

  const handleAddRecommendation = () => {
    if (currentPost) {
      const newProduct: Product = {
        id: uuid(),
        name: '',
        description: '',
        imageUrl: '',
        price: '',
        category: '',
        inStock: true
      };

      setCurrentPost(prev => ({
        ...prev!,
        recommendations: [...(prev?.recommendations || []), newProduct]
      }));
    }
  };

  const handleUpdateRecommendation = (index: number, field: keyof Product, value: string | boolean): void => {
    if (currentPost) {
      setCurrentPost(prev => {
        if (!prev) return prev;
        const recommendations = [...(prev.recommendations || [])];
        recommendations[index] = {
          ...recommendations[index],
          [field]: value
        };
        return {
          ...prev,
          recommendations
        };
      });
    }
  };

  const handleRemoveRecommendation = (index: number): void => {
    if (currentPost) {
      setCurrentPost(prev => ({
        ...prev!,
        recommendations: (prev?.recommendations || []).filter((_: Product, i: number) => i !== index)
      }));
    }
  };

  const addBlock = (type: BlockType) => {
    const newBlock = createBlock(type, contentBlocks.length);
    setContentBlocks([...contentBlocks, newBlock]);
    setIsDirty(true);
  };

  const updateBlock = (blockId: string, updates: Partial<ContentBlock>) => {
    setContentBlocks(prevBlocks => 
      prevBlocks.map(block => {
        if (block.id === blockId) {
          return {
            ...block,
            ...updates,
            type: updates.type || block.type,
            order: block.order
          } as ContentBlock;
        }
        return block;
      })
    );
    setIsDirty(true);
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = contentBlocks.findIndex(block => block.id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === contentBlocks.length - 1)
    ) {
      return;
    }

    const newBlocks = [...contentBlocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    
    // Update order numbers
    newBlocks.forEach((block, idx) => {
      block.order = idx;
    });

    setContentBlocks(newBlocks);
    setIsDirty(true);
  };

  const deleteBlock = (id: string) => {
    setContentBlocks(blocks => {
      const newBlocks = blocks.filter(block => block.id !== id);
      // Update order numbers
      newBlocks.forEach((block, idx) => {
        block.order = idx;
      });
      return newBlocks;
    });
    setIsDirty(true);
  };

  // When initializing a new content block from existing content
  const createInitialTextBlock = (content: string): TextBlock => ({
    id: uuid(),
    type: 'text',
    content,
    order: 0
  });

  // Update the setCurrentPost calls to handle the BlogPost type correctly
  const handleInputChange = (field: keyof BlogPost, value: any) => {
    setCurrentPost(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: value
      } as BlogPost;
    });
    setIsDirty(true);
  };

  const handleDuplicatePost = async (post: BlogPost) => {
    const duplicatedPost: BlogPost = {
      ...post,
      id: uuid(),
      title: `${post.title} (Copy)`,
      slug: `${post.slug}-copy-${Date.now()}`,
      publishedDate: new Date().toISOString()
    };
    
    try {
      const success = await savePost(duplicatedPost);
      
      if (success) {
        // Refresh the posts list
        const updatedPosts = await getAllPosts();
        setPosts(updatedPosts);
        
        // Show success message
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-[#9ed04b] text-gray-900 px-6 py-3 rounded-lg shadow-lg z-50';
        toast.innerHTML = 'Post duplicated successfully!';
        document.body.appendChild(toast);
        
        setTimeout(() => {
          toast.remove();
        }, 3000);
      } else {
        throw new Error('Failed to duplicate post');
      }
    } catch (error) {
      console.error('Error duplicating post:', error);
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      toast.innerHTML = 'Error duplicating post. Please try again.';
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.remove();
      }, 3000);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Blog Editor</h1>
          <div>
            <Link to="/blog" className="text-[#9ed04b] hover:underline mr-4">
              Back to Blog
            </Link>
          </div>
        </div>
        
        {isEditing ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className={isPreview ? "lg:col-span-6" : "lg:col-span-12"}>
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">
                    {currentPost?.id ? 'Edit Post' : 'Create New Post'}
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsPreview(!isPreview)}
                      className="flex items-center bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded transition-colors text-sm"
                    >
                      <Eye size={16} className="mr-1" />
                      {isPreview ? 'Hide Preview' : 'Show Preview'}
                    </button>
                    <button
                      onClick={handleSavePost}
                      disabled={isSaving}
                      className={`bg-[#9ed04b] text-gray-900 px-4 py-2 rounded flex items-center gap-2 ${
                        isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#8ebc44]'
                      }`}
                    >
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-900 border-t-transparent" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to cancel? Unsaved changes will be lost.')) {
                          setIsEditing(false);
                          setCurrentPost(null);
                        }
                      }}
                      className="flex items-center bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded transition-colors text-sm"
                    >
                      <ArrowLeft size={16} className="mr-1" />
                      Cancel
                    </button>
                  </div>
                </div>
                
                {/* Form fields in 2 columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-400 mb-1 text-sm">Title</label>
                    <input
                      type="text"
                      value={currentPost?.title || ''}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className="w-full bg-gray-700 text-white rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#9ed04b]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1 text-sm">Slug (URL)</label>
                    <input
                      type="text"
                      value={currentPost?.slug || ''}
                      onChange={(e) => handleInputChange('slug', e.target.value)}
                      className="w-full bg-gray-700 text-white rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#9ed04b]"
                      placeholder="Will be generated from title if left empty"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-400 mb-1 text-sm">Cover Image URL</label>
                    <input
                      type="text"
                      value={currentPost?.coverImage || ''}
                      onChange={(e) => handleInputChange('coverImage', e.target.value)}
                      className="w-full bg-gray-700 text-white rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#9ed04b]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1 text-sm">Publish Date</label>
                    <input
                      type="date"
                      value={currentPost?.publishedDate || ''}
                      onChange={(e) => handleInputChange('publishedDate', e.target.value)}
                      className="w-full bg-gray-700 text-white rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#9ed04b]"
                    />
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-400 mb-1 text-sm">Excerpt</label>
                  <textarea
                    value={currentPost?.excerpt || ''}
                    onChange={(e) => handleInputChange('excerpt', e.target.value)}
                    className="w-full bg-gray-700 text-white rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#9ed04b] h-16"
                  />
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-gray-400 text-sm">Content (Markdown)</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const content = currentPost?.content || '';
                          const newContent = content + '\n\n## New Section\n\nAdd your content here.\n';
                          handleInputChange('content', newContent);
                        }}
                        className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-2 py-1 rounded flex items-center gap-1"
                      >
                        <Plus size={14} />
                        Add Section
                      </button>
                      <button
                        onClick={() => {
                          const content = currentPost?.content || '';
                          const newContent = content + '\n\n---\n\n';
                          handleInputChange('content', newContent);
                        }}
                        className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-2 py-1 rounded flex items-center gap-1"
                      >
                        Add Divider
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={currentPost?.content || ''}
                    onChange={(e) => handleInputChange('content', e.target.value)}
                    className="w-full bg-gray-700 text-white rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#9ed04b] h-64 font-mono text-sm"
                  />
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-2">
                    <button
                      onClick={() => {
                        const content = currentPost?.content || '';
                        const cursorPos = (document.activeElement as HTMLTextAreaElement)?.selectionStart || content.length;
                        const newContent = content.substring(0, cursorPos) + '## Section Title\n\n' + content.substring(cursorPos);
                        handleInputChange('content', newContent);
                      }}
                      className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-2 py-1 rounded"
                    >
                      H2 Heading
                    </button>
                    <button
                      onClick={() => {
                        const content = currentPost?.content || '';
                        const cursorPos = (document.activeElement as HTMLTextAreaElement)?.selectionStart || content.length;
                        const newContent = content.substring(0, cursorPos) + '### Subsection Title\n\n' + content.substring(cursorPos);
                        handleInputChange('content', newContent);
                      }}
                      className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-2 py-1 rounded"
                    >
                      H3 Heading
                    </button>
                    <button
                      onClick={() => {
                        const content = currentPost?.content || '';
                        const cursorPos = (document.activeElement as HTMLTextAreaElement)?.selectionStart || content.length;
                        const productPlaceholder = 
`<!-- Product Recommendation -->
Check out this recommended product: {{PRODUCT_INDEX}}

<!-- Replace PRODUCT_INDEX with the index of the product (1, 2, 3, etc.) -->
`;
                        const newContent = content.substring(0, cursorPos) + productPlaceholder + content.substring(cursorPos);
                        handleInputChange('content', newContent);
                      }}
                      className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-2 py-1 rounded"
                    >
                      Product Placeholder
                    </button>
                    <button
                      onClick={() => {
                        const content = currentPost?.content || '';
                        const cursorPos = (document.activeElement as HTMLTextAreaElement)?.selectionStart || content.length;
                        const imagePlaceholder = 
`![Image Description](${currentPost?.images?.[0] || 'image-url-here'})

`;
                        const newContent = content.substring(0, cursorPos) + imagePlaceholder + content.substring(cursorPos);
                        handleInputChange('content', newContent);
                      }}
                      className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-2 py-1 rounded"
                    >
                      Insert Image
                    </button>
                  </div>
                </div>
                
                {/* Featured Product Section */}
                <div className="mb-4 border-t border-gray-700 pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold">Recommended Products for this Post</h3>
                    <button
                      onClick={() => handleAddProductBlock()}
                      className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-2 py-1 rounded flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Add Product Block
                    </button>
                  </div>
                  
                  {contentBlocks.filter(block => block.type === 'product').length === 0 && (
                    <div className="text-center py-4 bg-gray-700 rounded-lg mb-4">
                      <p className="text-gray-400 mb-2">No product blocks added yet</p>
                      <button
                        onClick={() => handleAddProductBlock()}
                        className="bg-gray-600 hover:bg-gray-500 text-sm px-3 py-1 rounded"
                      >
                        Add Product Block
                      </button>
                    </div>
                  )}
                  
                  {contentBlocks.filter(block => block.type === 'product').length > 0 && (
                    <div className="space-y-4 mt-4">
                      {contentBlocks
                        .filter(block => block.type === 'product')
                        .map((block, index) => renderProductBlockEditor(block as ProductBlock, index))}
                    </div>
                  )}
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-400 mb-1 text-sm">Tags</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {currentPost?.tags?.map(tag => (
                      <div key={tag} className="bg-gray-700 text-white text-sm px-2 py-1 rounded flex items-center gap-1">
                        <span>{tag}</span>
                        <button 
                          onClick={() => handleRemoveTag(tag)}
                          className="text-gray-400 hover:text-white"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      list="available-tags"
                      placeholder="Add a tag..."
                      className="flex-1 bg-gray-700 text-white rounded-l p-2 focus:outline-none focus:ring-1 focus:ring-[#9ed04b]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                    />
                    <datalist id="available-tags">
                      {allTags.map(tag => (
                        <option key={tag} value={tag} />
                      ))}
                    </datalist>
                    <button
                      onClick={handleAddTag}
                      className="bg-gray-600 hover:bg-gray-500 text-white px-3 rounded-r"
                    >
                      Add
                    </button>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-gray-400 text-sm">In-Content Images</label>
                    <button
                      onClick={() => {
                        const url = prompt('Enter image URL:');
                        if (url) {
                          handleAddImage(url);
                        }
                      }}
                      className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-2 py-1 rounded flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Add Image
                    </button>
                  </div>
                  <div className="text-sm text-gray-400 mb-2">
                    <p>Images can be added to your content using markdown: <code>![Alt text](image-url)</code></p>
                    <p>Or by adding an image block which can be configured with captions and sizing.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {currentPost?.images?.map((img, index) => (
                      <div key={index} className="relative">
                        <img 
                          src={img} 
                          alt={`Image ${index}`} 
                          className="w-full h-24 object-cover rounded"
                        />
                        <button
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-2 right-2 bg-gray-900/80 hover:bg-red-600/80 text-white rounded-full p-1"
                        >
                          <Trash size={14} />
                        </button>
                        <div className="text-xs bg-gray-800 px-2 py-1 rounded mt-1">
                          Image {index+1}: Copy URL to use in content
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="border-t border-gray-700 pt-4">
                  <label className="block text-gray-400 mb-1 text-sm">Author Information</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={currentPost?.author?.name || ''}
                      onChange={(e) => handleAuthorChange('name', e.target.value)}
                      placeholder="Author Name"
                      className="bg-gray-700 text-white rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#9ed04b]"
                    />
                    <input
                      type="text"
                      value={currentPost?.author?.avatar || ''}
                      onChange={(e) => handleAuthorChange('avatar', e.target.value)}
                      placeholder="Avatar URL"
                      className="bg-gray-700 text-white rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#9ed04b]"
                    />
                  </div>
                  <textarea
                    value={currentPost?.author?.bio || ''}
                    onChange={(e) => handleAuthorChange('bio', e.target.value)}
                    placeholder="Author Bio"
                    className="w-full bg-gray-700 text-white rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#9ed04b] h-16 mt-2"
                  />
                </div>
              </div>
            </div>
            
            {isPreview && (
              <div className="lg:col-span-6">
                <div className="bg-gray-800 rounded-lg p-6 sticky top-8">
                  <h2 className="text-xl font-bold mb-6">Preview</h2>
                  
                  {currentPost?.coverImage && (
                    <div className="mb-4 rounded-lg overflow-hidden">
                      <img 
                        src={currentPost.coverImage}
                        alt="Cover"
                        className="w-full h-56 object-cover"
                      />
                    </div>
                  )}
                  
                  <h1 className="text-2xl font-bold mb-2">{currentPost?.title || 'Untitled Post'}</h1>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {currentPost?.tags?.map(tag => (
                      <span key={tag} className="bg-gray-700 text-white text-xs px-2 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <p className="text-gray-400 text-sm mb-6">{currentPost?.excerpt || 'No excerpt provided'}</p>
                  
                  {/* Featured Product Preview */}
                  {currentPost?.recommendations?.[0] && (
                    <div className="bg-gray-700 rounded-lg p-4 mb-6">
                      <h3 className="text-lg font-semibold mb-2">Featured Product</h3>
                      <div className="flex flex-col md:flex-row gap-4">
                        {currentPost.recommendations[0].imageUrl && (
                          <div className="md:w-1/3">
                            <img 
                              src={currentPost.recommendations[0].imageUrl} 
                              alt={currentPost.recommendations[0].name}
                              className="w-full h-auto rounded-lg"
                            />
                          </div>
                        )}
                        <div className="md:w-2/3">
                          <h4 className="text-lg font-semibold">{currentPost.recommendations[0].name}</h4>
                          <p className="text-gray-400 my-2">{currentPost.recommendations[0].description}</p>
                          <div className="text-[#9ed04b] font-semibold">{currentPost.recommendations[0].price}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="border-t border-gray-700 my-6 pt-6">
                    <MarkdownRenderer content={currentPost?.content || '*No content provided*'} />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">All Blog Posts ({posts.length})</h2>
              <button
                onClick={handleCreateNew}
                className="bg-[#9ed04b] hover:bg-[#9ed04b]/80 text-gray-900 px-4 py-2 rounded-lg transition-colors flex items-center"
              >
                <Plus size={18} className="mr-2" />
                New Post
              </button>
            </div>
            
            <div className="space-y-6">
              {posts.map(post => (
                <div key={post.id} className="bg-gray-800 rounded-lg p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">{post.title}</h3>
                      <p className="text-gray-400">{post.excerpt}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDuplicatePost(post)}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded flex items-center gap-1"
                        title="Duplicate post"
                      >
                        <Copy className="w-4 h-4" />
                        <span className="hidden sm:inline">Duplicate</span>
                      </button>
                      <button
                        onClick={() => handleEditPost(post)}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded flex items-center gap-1"
                      >
                        <Edit className="w-4 h-4" />
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded flex items-center gap-1"
                      >
                        <Trash className="w-4 h-4" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {posts.length === 0 && (
                <div className="text-center py-12 bg-gray-800 rounded-lg">
                  <p className="text-gray-400">No blog posts yet. Create your first post!</p>
                  <button
                    onClick={handleCreateNew}
                    className="mt-4 bg-[#9ed04b] hover:bg-[#9ed04b]/80 text-gray-900 px-4 py-2 rounded transition-colors"
                  >
                    Create First Post
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default LocalEditor; 