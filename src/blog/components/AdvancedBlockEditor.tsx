import React, { useState, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { ContentBlock, BlockType, Product } from '../../types';
import { getProductById } from '../data/productData';
import ProductCard from './ProductCard';
import ProductSelector from './ProductSelector';
import ProductManager from './ProductManager';
import { 
  X, ArrowUp, ArrowDown, Trash, Plus, Image, AlignLeft, 
  ShoppingBag, Minus, Code, Type, Heading, Quote, FileText, Copy, Eye
} from 'lucide-react';
import logoImage from '../../images/Logo.png';
import { STOCK_IMAGES } from '../data/stockImages';

interface AdvancedBlockEditorProps {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  onPreview?: () => void;
}

// Helper function to get the icon for a block type
const getBlockTypeIcon = (type: string) => {
  switch (type) {
    case 'title':
      return <Type size={16} className="text-blue-400" />;
    case 'headline':
      return <Heading size={16} className="text-green-400" />;
    case 'text':
      return <AlignLeft size={16} className="text-gray-400" />;
    case 'image':
      return <Image size={16} className="text-purple-400" />;
    case 'product':
      return <ShoppingBag size={16} className="text-[#9ed04b]" />;
    case 'divider':
      return <Minus size={16} className="text-gray-400" />;
    case 'excerpt':
      return <Quote size={16} className="text-yellow-400" />;
    case 'snippet':
      return <Code size={16} className="text-red-400" />;
    default:
      return <FileText size={16} className="text-gray-400" />;
  }
};

// Helper function to get a friendly name for a block type
const getBlockTypeName = (type: string) => {
  switch (type) {
    case 'title':
      return 'Title';
    case 'headline':
      return 'Heading';
    case 'text':
      return 'Text';
    case 'image':
      return 'Image';
    case 'product':
      return 'Product';
    case 'divider':
      return 'Divider';
    case 'excerpt':
      return 'Excerpt';
    case 'snippet':
      return 'Code';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
};

const AdvancedBlockEditor: React.FC<AdvancedBlockEditorProps> = ({ blocks, onChange, onPreview }) => {
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [showProductManager, setShowProductManager] = useState(false);

  // Handle adding a new block
  const handleAddBlock = (type: BlockType) => {
    let newBlock: ContentBlock;
    
    switch (type) {
      case 'title':
        newBlock = createTitleBlock();
        break;
      case 'headline':
        newBlock = createHeadlineBlock();
        break;
      case 'text':
        newBlock = createTextBlock();
        break;
      case 'image':
        newBlock = createImageBlock();
        break;
      case 'product':
        newBlock = createProductBlock();
        break;
      case 'divider':
        newBlock = createDividerBlock();
        break;
      case 'excerpt':
        newBlock = createExcerptBlock();
        break;
      case 'snippet':
        newBlock = createSnippetBlock();
        break;
      default:
        newBlock = createTextBlock();
    }
    
    // Set the order to be the last in the list
    newBlock.order = blocks.length;
    
    onChange([...blocks, newBlock]);
    setSelectedBlock(newBlock.id);
  };

  // Handle updating a block's content
  const handleUpdateBlock = (id: string, content: string, metadata?: Record<string, any>) => {
    const updatedBlocks = blocks.map(block => {
      if (block.id === id) {
        return { ...block, content, ...(metadata ? metadata : {}) };
      }
      return block;
    });
    
    onChange(updatedBlocks);
  };

  // Handle deleting a block
  const handleDeleteBlock = (id: string) => {
    const updatedBlocks = blocks.filter(block => block.id !== id);
    
    // Update the order of the remaining blocks
    const reorderedBlocks = updatedBlocks.map((block, index) => ({
      ...block,
      order: index
    }));
    
    onChange(reorderedBlocks);
    setSelectedBlock(null);
  };

  // Handle duplicating a block
  const handleDuplicateBlock = (id: string) => {
    const blockToDuplicate = blocks.find(block => block.id === id);
    
    if (!blockToDuplicate) return;
    
    const newBlock = {
      ...blockToDuplicate,
      id: uuid(),
      order: blocks.length
    };
    
    onChange([...blocks, newBlock]);
    setSelectedBlock(newBlock.id);
  };

  // Handle moving a block up
  const handleMoveBlockUp = (id: string) => {
    const blockIndex = blocks.findIndex(block => block.id === id);
    
    if (blockIndex <= 0) return;
    
    const updatedBlocks = [...blocks];
    const temp = updatedBlocks[blockIndex];
    updatedBlocks[blockIndex] = updatedBlocks[blockIndex - 1];
    updatedBlocks[blockIndex - 1] = temp;
    
    // Update the order property
    const reorderedBlocks = updatedBlocks.map((block, index) => ({
      ...block,
      order: index
    }));
    
    onChange(reorderedBlocks);
  };

  // Handle moving a block down
  const handleMoveBlockDown = (id: string) => {
    const blockIndex = blocks.findIndex(block => block.id === id);
    
    if (blockIndex >= blocks.length - 1) return;
    
    const updatedBlocks = [...blocks];
    const temp = updatedBlocks[blockIndex];
    updatedBlocks[blockIndex] = updatedBlocks[blockIndex + 1];
    updatedBlocks[blockIndex + 1] = temp;
    
    // Update the order property
    const reorderedBlocks = updatedBlocks.map((block, index) => ({
      ...block,
      order: index
    }));
    
    onChange(reorderedBlocks);
  };

  // Handle drag and drop reordering
  const onDragEnd = (result: DropResult) => {
    const { destination, source } = result;
    
    // If dropped outside the list or no movement
    if (!destination || destination.index === source.index) {
      return;
    }
    
    const updatedBlocks = [...blocks];
    const [removed] = updatedBlocks.splice(source.index, 1);
    updatedBlocks.splice(destination.index, 0, removed);
    
    // Update the order property
    const reorderedBlocks = updatedBlocks.map((block, index) => ({
      ...block,
      order: index
    }));
    
    onChange(reorderedBlocks);
  };

  // Render the controls for a block
  const renderBlockControls = (blockId: string, index: number) => {
    return (
      <div className="flex items-center space-x-1">
        <button
          onClick={() => handleMoveBlockUp(blockId)}
          disabled={index === 0}
          className={`p-1 rounded hover:bg-gray-600 ${index === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Move Up"
        >
          <ArrowUp size={14} />
        </button>
        <button
          onClick={() => handleMoveBlockDown(blockId)}
          disabled={index === blocks.length - 1}
          className={`p-1 rounded hover:bg-gray-600 ${index === blocks.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Move Down"
        >
          <ArrowDown size={14} />
        </button>
        <button
          onClick={() => handleDuplicateBlock(blockId)}
          className="p-1 rounded hover:bg-gray-600"
          title="Duplicate"
        >
          <Copy size={14} />
        </button>
        <button
          onClick={() => handleDeleteBlock(blockId)}
          className="p-1 rounded hover:bg-gray-600 text-red-400"
          title="Delete"
        >
          <Trash size={14} />
        </button>
      </div>
    );
  };

  // Render the editor for a specific block type
  const renderBlockEditor = (block: ContentBlock, index: number) => {
    switch (block.type) {
      case 'title':
        return (
          <div className="flex-1">
            <input
              type="text"
              value={block.content}
              onChange={(e) => handleUpdateBlock(block.id, e.target.value)}
              placeholder="Post Title"
              className="w-full bg-gray-700 text-white rounded p-3 text-xl font-bold focus:outline-none focus:ring-1 focus:ring-[#9ed04b]"
            />
          </div>
        );
        
      case 'headline':
        const headlineBlock = block as any;
        return (
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <select
                value={headlineBlock.level || 2}
                onChange={(e) => handleUpdateBlock(block.id, block.content, { level: parseInt(e.target.value) })}
                className="bg-gray-700 text-white rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#9ed04b]"
              >
                <option value={1}>Heading 1</option>
                <option value={2}>Heading 2</option>
                <option value={3}>Heading 3</option>
                <option value={4}>Heading 4</option>
                <option value={5}>Heading 5</option>
                <option value={6}>Heading 6</option>
              </select>
            </div>
            <input
              type="text"
              value={block.content}
              onChange={(e) => handleUpdateBlock(block.id, e.target.value)}
              placeholder={`Heading Level ${headlineBlock.level || 2}`}
              className="w-full bg-gray-700 text-white rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#9ed04b]"
            />
          </div>
        );
        
      case 'text':
        return (
          <div className="flex-1">
            <textarea
              value={block.content}
              onChange={(e) => handleUpdateBlock(block.id, e.target.value)}
              placeholder="Write your content here..."
              className="w-full bg-gray-700 text-white rounded p-2 min-h-[150px] focus:outline-none focus:ring-1 focus:ring-[#9ed04b]"
            />
          </div>
        );
        
      case 'image':
        const imageBlock = block as any;
        return (
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <select
                className="bg-gray-700 text-white rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#9ed04b] text-sm flex-1"
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) handleUpdateBlock(block.id, block.content, { url: val });
                }}
                value=""
              >
                <option value="">Pick from gallery...</option>
                {Object.entries(STOCK_IMAGES).flatMap(([main, subs]) => {
                  if (main === 'default' || Array.isArray(subs)) return [];
                  return Object.entries(subs as Record<string, string[]>).flatMap(([sub, urls]) =>
                    (urls as string[]).map((url, i) => (
                      <option key={`${main}-${sub}-${i}`} value={url}>
                        {main} › {sub} ({i + 1})
                      </option>
                    ))
                  );
                })}
              </select>
            </div>
            <input
              type="text"
              value={imageBlock.url || ''}
              onChange={(e) => handleUpdateBlock(block.id, block.content, { url: e.target.value })}
              placeholder="Or paste Image URL"
              className="w-full bg-gray-700 text-white rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#9ed04b]"
            />
            <input
              type="text"
              value={imageBlock.alt || ''}
              onChange={(e) => handleUpdateBlock(block.id, block.content, { alt: e.target.value })}
              placeholder="Image alt text"
              className="w-full bg-gray-700 text-white rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#9ed04b]"
            />
            <input
              type="text"
              value={imageBlock.caption || ''}
              onChange={(e) => handleUpdateBlock(block.id, block.content, { caption: e.target.value })}
              placeholder="Image caption"
              className="w-full bg-gray-700 text-white rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#9ed04b]"
            />
            {imageBlock.url && (
              <div className="mt-2 bg-gray-800 p-2 rounded">
                <img 
                  src={imageBlock.url} 
                  alt={imageBlock.alt || ''} 
                  className="max-h-64 object-contain mx-auto"
                  onError={(e) => {
                    e.currentTarget.src = logoImage;
                  }}
                />
                {imageBlock.caption && (
                  <p className="text-sm text-gray-400 mt-2 text-center">{imageBlock.caption}</p>
                )}
              </div>
            )}
          </div>
        );
        
      case 'product':
        const productBlock = block as any;
        return (
          <div className="flex-1 space-y-3">
            {!showProductManager ? (
              <ProductSelector 
                selectedProductId={productBlock.productId || ''}
                onProductSelect={(product) => {
                  handleUpdateBlock(block.id, '', { 
                    productId: product.id,
                    productName: product.name,
                    description: product.description,
                    imageUrl: product.imageUrl
                  });
                }}
              />
            ) : (
              <div>
                <ProductManager 
                  onSelectProduct={(product) => {
                    handleUpdateBlock(block.id, '', { 
                      productId: product.id,
                      productName: product.name,
                      description: product.description,
                      imageUrl: product.imageUrl
                    });
                    setShowProductManager(false);
                  }} 
                />
                <button
                  onClick={() => setShowProductManager(false)}
                  className="mt-4 text-gray-400 hover:text-white"
                >
                  ← Back to Block Editor
                </button>
              </div>
            )}
            {productBlock.productId && !showProductManager && (
              <div className="mt-2 bg-gray-800 p-2 rounded">
                <ProductCard product={getProductById(productBlock.productId)!} />
              </div>
            )}
          </div>
        );
        
      case 'divider':
        const dividerBlock = block as any;
        return (
          <div className="flex-1">
            <div className="flex gap-2 mb-2">
              <select
                value={dividerBlock.style || 'solid'}
                onChange={(e) => handleUpdateBlock(block.id, '', { style: e.target.value })}
                className="bg-gray-700 text-white rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#9ed04b]"
              >
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
            <div className={`border-t-2 border-${dividerBlock.style || 'solid'} border-gray-700 my-4`}></div>
          </div>
        );
        
      case 'excerpt':
        return (
          <div className="flex-1">
            <textarea
              value={block.content}
              onChange={(e) => handleUpdateBlock(block.id, e.target.value)}
              placeholder="Excerpt text..."
              className="w-full bg-gray-700 text-white rounded p-2 min-h-[100px] focus:outline-none focus:ring-1 focus:ring-[#9ed04b]"
            />
          </div>
        );

      case 'snippet':
        const snippetBlock = block as any;
        return (
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <select
                value={snippetBlock.language || 'javascript'}
                onChange={(e) => handleUpdateBlock(block.id, block.content, { language: e.target.value })}
                className="bg-gray-700 text-white rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#9ed04b]"
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="csharp">C#</option>
                <option value="php">PHP</option>
                <option value="ruby">Ruby</option>
                <option value="go">Go</option>
                <option value="swift">Swift</option>
                <option value="kotlin">Kotlin</option>
                <option value="rust">Rust</option>
                <option value="bash">Bash</option>
                <option value="sql">SQL</option>
                <option value="json">JSON</option>
                <option value="xml">XML</option>
                <option value="markdown">Markdown</option>
                <option value="yaml">YAML</option>
                <option value="plaintext">Plain Text</option>
              </select>
            </div>
            <textarea
              value={block.content}
              onChange={(e) => handleUpdateBlock(block.id, e.target.value)}
              placeholder={`Enter your ${snippetBlock.language || 'code'} snippet here...`}
              className="w-full bg-gray-700 text-white rounded p-2 min-h-[150px] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#9ed04b]"
            />
            {block.content && (
              <div className="mt-2 bg-gray-800 p-2 rounded overflow-x-auto">
                <pre className="text-sm">
                  <code className={`language-${snippetBlock.language || 'javascript'}`}>
                    {block.content}
                  </code>
                </pre>
              </div>
            )}
          </div>
        );
        
      default:
        return <div>Unknown block type: {block.type}</div>;
    }
  };

  // Sort blocks by order
  const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);

  return (
    <div className="bg-gray-900 text-white p-6 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Content Blocks</h2>
        {onPreview && (
          <button
            onClick={onPreview}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded flex items-center text-sm transition-colors"
          >
            <Eye size={16} className="mr-2" />
            Preview
          </button>
        )}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="content-blocks">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-6"
            >
              {sortedBlocks.map((block, index) => (
                <Draggable key={block.id} draggableId={block.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      id={`block-${block.id}`}
                      className={`border ${snapshot.isDragging ? 'border-[#9ed04b] shadow-lg' : 'border-gray-700'} rounded-lg overflow-hidden ${
                        selectedBlock === block.id ? 'border-[#9ed04b] ring-1 ring-[#9ed04b]/30' : 'hover:border-gray-600'
                      } transition-all duration-200 ${snapshot.isDragging ? 'bg-gray-800/90 backdrop-blur-sm' : ''}`}
                    >
                      <div className="bg-gray-700 px-3 py-2 flex justify-between items-center">
                        <div 
                          {...provided.dragHandleProps}
                          className="flex items-center space-x-2 cursor-grab active:cursor-grabbing"
                        >
                          <div className="flex items-center">
                            {getBlockTypeIcon(block.type)}
                            <div className="text-sm font-medium uppercase text-gray-400 ml-2">
                              {getBlockTypeName(block.type)}
                            </div>
                          </div>
                          <div className="text-xs bg-gray-600 px-1.5 py-0.5 rounded text-gray-300">
                            #{index + 1}
                          </div>
                        </div>
                        {renderBlockControls(block.id, index)}
                      </div>
                      <div className="p-4 flex">
                        {renderBlockEditor(block, index)}
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="pt-6 mt-6 border-t border-gray-700">
        <h3 className="text-sm text-gray-400 mb-3">Add Content Block</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleAddBlock('title')}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded flex items-center text-sm transition-colors"
          >
            <Type size={16} className="mr-2" />
            Title
          </button>
          <button
            onClick={() => handleAddBlock('headline')}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded flex items-center text-sm transition-colors"
          >
            <Heading size={16} className="mr-2" />
            Headline
          </button>
          <button
            onClick={() => handleAddBlock('text')}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded flex items-center text-sm transition-colors"
          >
            <AlignLeft size={16} className="mr-2" />
            Text
          </button>
          <button
            onClick={() => handleAddBlock('image')}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded flex items-center text-sm transition-colors"
          >
            <Image size={16} className="mr-2" />
            Image
          </button>
          <button
            onClick={() => handleAddBlock('product')}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded flex items-center text-sm transition-colors"
          >
            <ShoppingBag size={16} className="mr-2" />
            Product
          </button>
          <button
            onClick={() => handleAddBlock('excerpt')}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded flex items-center text-sm transition-colors"
          >
            <Quote size={16} className="mr-2" />
            Excerpt
          </button>
          <button
            onClick={() => handleAddBlock('divider')}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded flex items-center text-sm transition-colors"
          >
            <Minus size={16} className="mr-2" />
            Divider
          </button>
          <button
            onClick={() => handleAddBlock('snippet')}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded flex items-center text-sm transition-colors"
          >
            <Code size={16} className="mr-2" />
            Code Snippet
          </button>
        </div>
      </div>
    </div>
  );
};

// Predefined block templates
export const createTitleBlock = (content: string = ''): ContentBlock => ({
  id: uuid(),
  type: 'title',
  content,
  order: 0
});

export const createHeadlineBlock = (content: string = '', level: number = 2): ContentBlock => ({
  id: uuid(),
  type: 'headline',
  content,
  level,
  order: 0
});

export const createTextBlock = (content: string = ''): ContentBlock => ({
  id: uuid(),
  type: 'text',
  content,
  order: 0
});

export const createImageBlock = (url: string = '', alt: string = '', caption: string = ''): ContentBlock => ({
  id: uuid(),
  type: 'image',
  url,
  alt,
  caption,
  order: 0
});

export const createProductBlock = (productId: string = ''): ContentBlock => ({
  id: uuid(),
  type: 'product',
  productId,
  order: 0
});

export const createDividerBlock = (style: 'solid' | 'dashed' | 'dotted' = 'solid'): ContentBlock => ({
  id: uuid(),
  type: 'divider',
  style,
  order: 0
});

export const createExcerptBlock = (content: string = ''): ContentBlock => ({
  id: uuid(),
  type: 'excerpt',
  content,
  order: 0
});

export const createSnippetBlock = (content: string = '', language: string = 'javascript'): ContentBlock => ({
  id: uuid(),
  type: 'snippet',
  content,
  language,
  order: 0
});

export default AdvancedBlockEditor;
