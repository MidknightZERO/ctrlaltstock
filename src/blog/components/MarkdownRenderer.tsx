import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import FeaturedProductCallout from './FeaturedProductCallout';

interface MarkdownRendererProps {
  content: string;
}

const FEATURED_PRODUCT_REGEX = /<!--\s*featured-product:\s*(.+?)\s*-->/gs;

function parseFeaturedProductComment(match: string): { title: string; price?: string; imageUrl?: string; affiliateUrl: string } | null {
  const inner = match.replace(/^<!--\s*featured-product:\s*/, '').replace(/\s*-->$/, '').trim();
  const parts = inner.split(/\s*\|\s*/).map((p) => p?.trim() || '');
  if (parts.length >= 3) {
    const title = parts[0] || 'Product';
    const price = parts[1] || undefined;
    const affiliateUrl = parts.length >= 4 ? parts[3] : parts[2];
    const imageUrl = parts.length >= 4 ? parts[2] : undefined;
    return {
      title,
      price,
      imageUrl,
      affiliateUrl: affiliateUrl || '',
    };
  }
  return null;
}

const COVER_IMAGE_FALLBACK = '/Logo.png';

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const parts: Array<{ type: 'markdown' | 'featured'; value: string }> = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(FEATURED_PRODUCT_REGEX.source, 'gs');
  while ((m = re.exec(content)) !== null) {
    if (m.index > lastIndex) {
      parts.push({ type: 'markdown', value: content.slice(lastIndex, m.index) });
    }
    parts.push({ type: 'featured', value: m[0] });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: 'markdown', value: content.slice(lastIndex) });
  }
  if (parts.length === 0 && content) {
    parts.push({ type: 'markdown', value: content });
  }

  const mdProps = {
    className: "prose prose-invert max-w-none prose-headings:text-[#9ed04b] prose-a:text-[#9ed04b]",
    remarkPlugins: [remarkGfm] as const,
    components: {
        // Customize heading styles
        h1: ({ node, ...props }) => <h1 className="text-4xl font-bold mb-6" {...props} />,
        h2: ({ node, ...props }) => <h2 className="text-3xl font-bold mb-4 mt-8" {...props} />,
        h3: ({ node, ...props }) => <h3 className="text-2xl font-bold mb-3 mt-6" {...props} />,
        
        // Customize link styles (match green theme)
        a: ({ node, ...props }) => (
          <a className="text-[#9ed04b] hover:text-[#b3e05a] transition-colors" {...props} />
        ),
        
        // Customize list styles
        ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4" {...props} />,
        ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4" {...props} />,
        
        // Customize paragraph styles
        p: ({ node, ...props }) => <p className="mb-4 text-gray-300" {...props} />,
        
        // Customize code block styles
        code: ({ node, inline, ...props }) =>
          inline ? (
            <code className="bg-gray-800 px-1 py-0.5 rounded text-sm" {...props} />
          ) : (
            <code className="block bg-gray-800 p-4 rounded-lg mb-4 text-sm" {...props} />
          ),
        
        // Customize blockquote styles
        blockquote: ({ node, ...props }) => (
          <blockquote
            className="border-l-4 border-[#9ed04b] pl-4 italic text-gray-400 mb-4"
            {...props}
    />
        ),
        
        // Customize table styles
        table: ({ node, ...props }) => (
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full divide-y divide-gray-700" {...props} />
          </div>
        ),
        th: ({ node, ...props }) => (
          <th className="px-4 py-2 bg-gray-800 font-semibold text-left" {...props} />
        ),
        td: ({ node, ...props }) => (
          <td className="px-4 py-2 border-t border-gray-700" {...props} />
        ),

        // Inline images: padded white container; onError fallback to avoid broken icon
        img: ({ node, ...props }) => (
          <figure className="my-8 flex justify-center">
            <div className="inline-block p-4 md:p-6 bg-white rounded-xl shadow-lg border border-gray-200/80 max-w-full">
              <img
                {...props}
                className="rounded-lg max-h-80 md:max-h-96 object-contain mx-auto block"
                onError={(e) => {
                  const el = e.currentTarget;
                  if (el && el.src !== COVER_IMAGE_FALLBACK) el.src = COVER_IMAGE_FALLBACK;
                }}
              />
            </div>
          </figure>
        ),
      },
  };

  return (
    <div className="space-y-0">
      {parts.map((part, i) =>
        part.type === 'markdown' ? (
          part.value ? (
            <ReactMarkdown key={i} {...mdProps}>
              {part.value}
            </ReactMarkdown>
          ) : null
        ) : (
          (() => {
            const data = parseFeaturedProductComment(part.value);
            return data ? (
              <FeaturedProductCallout
                key={i}
                title={data.title}
                price={data.price}
                imageUrl={data.imageUrl}
                affiliateUrl={data.affiliateUrl}
              />
            ) : null;
          })()
        )
      )}
    </div>
  );
};

export default MarkdownRenderer; 