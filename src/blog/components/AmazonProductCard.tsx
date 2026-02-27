import React from 'react';
import { ExternalLink, ShoppingBag, Search } from 'lucide-react';

interface AmazonProduct {
  asin: string;
  title: string;
  imageUrl: string;
  price: string;
  affiliateUrl: string;
  searchUrl: string;
  category?: string;
  query?: string;
}

interface AmazonProductCardProps {
  product: AmazonProduct;
  featured?: boolean;
}

/**
 * AmazonProductCard — Renders a styled affiliate product card.
 * Used in BlogPost to display relevant Amazon products inline.
 */
const AmazonProductCard: React.FC<AmazonProductCardProps> = ({ product, featured = false }) => {
  const linkUrl = product.affiliateUrl || product.searchUrl;
  const hasImage = !!(product.imageUrl);
  const hasPrice = !!(product.price);

  return (
    <a
      href={linkUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      id={`amazon-product-${product.asin || product.query?.replace(/\s+/g, '-')}`}
      className={`
        group flex flex-col rounded-xl overflow-hidden border transition-all duration-300
        hover:shadow-[0_0_24px_rgba(158,208,75,0.25)] hover:-translate-y-1
        ${featured
          ? 'border-[#9ed04b]/50 bg-gradient-to-br from-gray-800 to-gray-800/80'
          : 'border-gray-700/60 bg-gray-800/70'
        }
      `}
      aria-label={`Buy ${product.title} on Amazon`}
    >
      {/* Product Image — white bg to match Amazon product images */}
      <div className="relative overflow-hidden bg-white aspect-[4/3] flex items-center justify-center p-4 border-b border-gray-200/40">
        {hasImage ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-600 p-6">
            <Search className="w-10 h-10 mb-2" />
            <span className="text-xs text-center">View on Amazon</span>
          </div>
        )}

        {/* Featured badge */}
        {featured && (
          <div className="absolute top-2 left-2 bg-[#9ed04b] text-gray-900 text-xs font-bold px-2 py-0.5 rounded-full">
            ⭐ Top Pick
          </div>
        )}

        {/* Price badge */}
        {hasPrice && (
          <div className="absolute bottom-2 right-2 bg-gray-900/90 text-[#9ed04b] font-bold px-3 py-1 rounded-full text-sm border border-[#9ed04b]/30">
            {product.price}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4 flex flex-col flex-1">
        <p className="text-white font-semibold text-sm leading-snug mb-3 line-clamp-2 group-hover:text-[#9ed04b] transition-colors">
          {product.title || product.query}
        </p>

        <div className="mt-auto">
          <div
            className="w-full flex items-center justify-center gap-2 bg-[#FF9900] hover:bg-[#e8880a] text-gray-900 font-bold py-2 px-4 rounded-lg text-sm transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            {product.asin ? 'View on Amazon' : 'Search Amazon'}
            <ExternalLink className="w-3 h-3 opacity-70" />
          </div>

          <p className="text-center text-gray-600 text-[10px] mt-2">
            Affiliate link — we may earn a commission
          </p>
        </div>
      </div>
    </a>
  );
};

/**
 * AmazonProductGrid — Renders a grid of Amazon product cards.
 * Auto-adapts layout to 1–4 products.
 */
interface AmazonProductGridProps {
  products: AmazonProduct[];
  title?: string;
}

export const AmazonProductGrid: React.FC<AmazonProductGridProps> = ({
  products,
  title = "Recommended on Amazon",
}) => {
  if (!products || products.length === 0) return null;

  const gridClass =
    products.length === 1
      ? 'grid-cols-1 max-w-xs'
      : products.length === 2
      ? 'grid-cols-1 sm:grid-cols-2 max-w-xl'
      : products.length === 3
      ? 'grid-cols-1 sm:grid-cols-3'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  return (
    <div className="my-8 mx-auto max-w-4xl p-6 rounded-2xl bg-gray-800/50 border border-gray-700/50 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg"
          alt="Amazon"
          className="h-5 opacity-80 invert"
        />
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>

      {/* Product grid — centered when narrow */}
      <div className={`grid ${gridClass} gap-4 ${products.length <= 2 ? 'mx-auto' : ''}`}>
        {products.map((product, i) => (
          <AmazonProductCard
            key={product.asin || product.query || i}
            product={product}
            featured={i === 0}
          />
        ))}
      </div>
    </div>
  );
};

export default AmazonProductCard;
