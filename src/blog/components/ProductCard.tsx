import React from 'react';
import { Product } from '../../types';
import { Star, ArrowUpRight } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  compact?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, compact = false }) => {
  const renderRatingStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <Star
        key={index}
        size={16}
        className={`${
          index < Math.floor(rating) 
            ? 'text-yellow-400 fill-yellow-400' 
            : index < rating 
              ? 'text-yellow-400 fill-yellow-400 opacity-50' 
              : 'text-gray-500'
        }`}
      />
    ));
  };

  if (compact) {
    return (
      <div className="flex items-center bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-[#9ed04b]/50 transition-colors">
        <img 
          src={product.imageUrl} 
          alt={product.name}
          className="w-20 h-20 object-cover object-center"
        />
        <div className="p-3 flex-1">
          <h3 className="text-sm font-medium">{product.name}</h3>
          <div className="flex items-center mt-1">
            {renderRatingStars(product.rating)}
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[#9ed04b] font-semibold">{product.price}</span>
            <a 
              href={product.affiliateLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-[#9ed04b] text-gray-900 px-2 py-1 rounded hover:bg-[#9ed04b]/90 transition-colors inline-flex items-center"
            >
              View <ArrowUpRight size={10} className="ml-1" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-[#9ed04b]/50 transition-colors">
      <div className="relative">
        <img 
          src={product.imageUrl} 
          alt={product.name}
          className="w-full h-48 object-cover object-center"
        />
        <span className="absolute top-2 right-2 bg-gray-900/80 text-white text-xs px-2 py-1 rounded">
          {product.category}
        </span>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-medium mb-2">{product.name}</h3>
        <p className="text-gray-400 text-sm mb-3 line-clamp-2">{product.description}</p>
        
        <div className="flex items-center mb-3">
          {renderRatingStars(product.rating)}
          <span className="text-gray-400 text-xs ml-2">{product.rating.toFixed(1)}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[#9ed04b] font-bold">{product.price}</span>
            <span className="text-gray-400 text-xs ml-2">at {product.retailer}</span>
          </div>
          <a 
            href={product.affiliateLink}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#9ed04b] text-gray-900 px-3 py-1.5 rounded-lg hover:bg-[#9ed04b]/90 transition-colors inline-flex items-center text-sm font-medium"
          >
            View Deal <ArrowUpRight size={14} className="ml-1" />
          </a>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex flex-wrap gap-1">
            {product.tags.map(tag => (
              <span key={tag} className="text-xs bg-gray-700 px-2 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard; 