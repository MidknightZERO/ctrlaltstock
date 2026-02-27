import React from 'react';
import { ExternalLink, ShoppingBag } from 'lucide-react';

interface FeaturedProductCalloutProps {
  title: string;
  price?: string;
  imageUrl?: string;
  affiliateUrl: string;
  description?: string;
}

/**
 * FeaturedProductCallout — Editorial-style product recommendation.
 * Image on left, product info and CTA on right. Renders inline in article body.
 */
const FeaturedProductCallout: React.FC<FeaturedProductCalloutProps> = ({
  title,
  price,
  imageUrl,
  affiliateUrl,
  description,
}) => {
  return (
    <a
      href={affiliateUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="my-10 mx-auto flex flex-col sm:flex-row gap-6 p-6 rounded-2xl border border-gray-700/50 bg-gray-800/50 backdrop-blur-sm max-w-2xl hover:shadow-[0_0_24px_rgba(158,208,75,0.15)] hover:border-[#9ed04b]/40 transition-all duration-300 group overflow-hidden no-underline"
      aria-label={`View ${title} on Amazon`}
    >
      {/* Product Image (left on desktop) — white bg to match Amazon product images */}
      <div className="flex-shrink-0 w-full sm:w-44 aspect-square sm:aspect-[4/3] rounded-xl overflow-hidden bg-white p-4 flex items-center justify-center border border-gray-200/60">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-600 p-6">
            <ShoppingBag className="w-12 h-12 mb-2 opacity-50" />
            <span className="text-xs text-center">View on Amazon</span>
          </div>
        )}
      </div>

      {/* Product Info (right) — centered */}
      <div className="flex-1 flex flex-col justify-center items-center text-center min-w-0">
        <div className="flex items-center justify-center gap-2 mb-2">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg"
            alt="Amazon"
            className="h-4 opacity-80 invert"
          />
          <span className="text-xs text-[#9ed04b] uppercase tracking-wider no-underline">Editor&apos;s Pick</span>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-[#9ed04b] transition-colors no-underline">
          {title}
        </h3>
        {description && (
          <p className="text-gray-400 text-sm mb-3 line-clamp-2">{description}</p>
        )}
        {price && (
          <p className="text-[#9ed04b] font-bold text-lg mb-4">{price}</p>
        )}
        <div className="inline-flex items-center gap-2 bg-[#FF9900] hover:bg-[#e8880a] text-gray-900 font-bold py-2.5 px-5 rounded-lg text-sm transition-colors w-fit">
          <span>View on Amazon</span>
          <ExternalLink className="w-4 h-4" />
        </div>
      </div>
    </a>
  );
};

export default FeaturedProductCallout;
