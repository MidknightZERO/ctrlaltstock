import React from 'react';
import { ContentBlock, TextBlock, ImageBlock, ProductBlock, HeadlineBlock, DividerBlock, ExcerptBlock, SnippetBlock } from '../../types.d';
import { getProductById } from '../data/productData';
import { ExternalLink } from 'react-feather';
import logoImage from '../../images/Logo.png';
import MarkdownRenderer from './MarkdownRenderer';

interface BlockRendererProps {
  blocks: ContentBlock[];
}

const BlockRenderer: React.FC<BlockRendererProps> = ({ blocks }) => {
  // Render an individual block
  const renderBlock = (block: ContentBlock) => {
    switch (block.type) {
      case 'title':
        return <h1 className="text-3xl lg:text-4xl font-bold mb-6">{block.content}</h1>;

      case 'headline':
        const headingBlock = block as HeadlineBlock;
        const HeadingTag = `h${headingBlock.level || 2}` as keyof JSX.IntrinsicElements;
        return (
          <HeadingTag className="font-bold mb-4 mt-8">
            {headingBlock.content}
          </HeadingTag>
        );

      case 'text':
        const textBlock = block as TextBlock;
        return (
          <div className="mb-6">
            <MarkdownRenderer content={textBlock.content} />
          </div>
        );

      case 'image':
        const imageBlock = block as ImageBlock;
        return (
          <figure className="my-8 flex flex-col items-center">
            <div className="inline-block p-4 md:p-6 bg-white rounded-xl shadow-lg border border-gray-200/80 max-w-full">
              <img
                src={imageBlock.url}
                alt={imageBlock.alt || ''}
                className="rounded-lg max-h-80 md:max-h-96 object-contain block"
                onError={(e) => {
                  e.currentTarget.src = logoImage;
                }}
              />
            </div>
            {imageBlock.caption && (
              <figcaption className="text-sm text-gray-400 mt-3 text-center max-w-2xl">
                {imageBlock.caption}
              </figcaption>
            )}
          </figure>
        );

      case 'product':
        const productBlock = block as ProductBlock;
        const product = getProductById(productBlock.productId);

        // If we have a product from the database, use it
        if (product) {
          return (
            <div className="my-8 mx-auto max-w-2xl rounded-2xl border border-gray-700/50 bg-gray-800/50 backdrop-blur-sm p-6 shadow-lg">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-1/3 flex-shrink-0">
                  <div className="rounded-xl overflow-hidden bg-white p-4 border border-gray-200/60">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-auto object-contain"
                    />
                  </div>
                </div>
                <div className="md:w-2/3">
                  <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
                  <p className="text-gray-300 mb-4">{product.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[#9ed04b] font-bold text-lg">{product.price}</span>
                    <a
                      href={product.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center bg-[#9ed04b] text-gray-900 px-4 py-2 rounded font-medium hover:bg-[#9ed04b]/90 transition-colors"
                    >
                      View Product <ExternalLink className="ml-1 w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // Fallback to direct block properties if no product was found
        if (productBlock.productName) {
          return (
            <div className="my-8 mx-auto max-w-2xl rounded-2xl border border-gray-700/50 bg-gray-800/50 backdrop-blur-sm p-6 shadow-lg">
              <div className="flex flex-col md:flex-row gap-6">
                {productBlock.imageUrl && (
                  <div className="md:w-1/3 flex-shrink-0">
                    <div className="rounded-xl overflow-hidden bg-white p-4 border border-gray-200/60">
                      <img
                        src={productBlock.imageUrl}
                        alt={productBlock.productName}
                        className="w-full h-auto object-contain"
                      />
                    </div>
                  </div>
                )}
                <div className={productBlock.imageUrl ? "md:w-2/3" : "w-full"}>
                  <h3 className="text-xl font-semibold mb-2">{productBlock.productName}</h3>
                  {productBlock.description && <p className="text-gray-300 mb-4">{productBlock.description}</p>}
                  <button className="inline-flex items-center bg-[#9ed04b] text-gray-900 px-4 py-2 rounded font-medium hover:bg-[#9ed04b]/90 transition-colors">
                    View Product <ExternalLink className="ml-1 w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        }

        return null;

      case 'divider':
        const dividerBlock = block as DividerBlock;
        return <hr className={`my-8 border-${dividerBlock.style || 'solid'} border-gray-700`} />;

      case 'excerpt':
        const excerptBlock = block as ExcerptBlock;
        return <p className="text-xl text-gray-400 italic mb-8">{excerptBlock.content}</p>;

      case 'snippet':
        const snippetBlock = block as SnippetBlock;
        return (
          <div className="my-8">
            <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
              <code className={`language-${snippetBlock.language || 'javascript'}`}>
                {snippetBlock.content}
              </code>
            </pre>
          </div>
        );

      default:
        return null;
    }
  };

  // Sort blocks by order property
  const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);

  return (
    <article className="prose prose-invert prose-lg max-w-none">
      {sortedBlocks.map(block => (
        <div key={block.id} className="blog-block">
          {renderBlock(block)}
        </div>
      ))}
    </article>
  );
};

export default BlockRenderer;