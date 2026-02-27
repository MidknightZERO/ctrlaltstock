import React from 'react';
import type { Product } from '../../types';
import { ShoppingCart, ExternalLink } from 'react-feather';

interface RecommendedProductsProps {
  products: Product[];
}

const RecommendedProducts: React.FC<RecommendedProductsProps> = ({ products }) => {
  if (!products || products.length === 0) return null;

  return (
    <div className="bg-gray-800 rounded-lg p-6 mt-8">
      <div className="flex items-center mb-6">
        <ShoppingCart className="w-6 h-6 text-[#9ed04b] mr-2" />
        <h2 className="text-xl font-semibold">Recommended Products</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <a
            key={product.id}
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300"
          >
            <div className="aspect-w-16 aspect-h-9 relative">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-48 object-cover"
              />
              <div className="absolute top-2 right-2 bg-[#9ed04b] text-gray-900 px-3 py-1 rounded-full font-medium">
                {product.price}
              </div>
            </div>
            
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-2 text-white group-hover:text-[#9ed04b] transition-colors">
                {product.name}
              </h3>
              <p className="text-gray-400 text-sm mb-3">
                {product.description}
              </p>
              <div className="flex items-center text-[#9ed04b]">
                <span className="text-sm">View Details</span>
                <ExternalLink className="w-4 h-4 ml-1" />
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default RecommendedProducts; 