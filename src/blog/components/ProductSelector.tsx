import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { products, getAllCategories, getProductById } from '../data/productData';
import ProductManager from './ProductManager';
import logoImage from '../../images/Logo.png';

interface ProductSelectorProps {
  onProductSelect: (product: Product) => void;
  selectedProductId?: string;
}

const ProductSelector: React.FC<ProductSelectorProps> = ({ onProductSelect, selectedProductId }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showProductManager, setShowProductManager] = useState(false);
  const categories = getAllCategories();

  useEffect(() => {
    if (selectedCategory) {
      setFilteredProducts(products.filter(p => p.category === selectedCategory));
    } else {
      setFilteredProducts(products);
    }
  }, [selectedCategory]);

  const handleProductSelect = (product: Product) => {
    onProductSelect(product);
    setShowProductManager(false);
  };

  return (
    <div className="space-y-4">
      {!showProductManager ? (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-gray-700 text-white rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#9ed04b]"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Product
            </label>
            <select
              value={selectedProductId || ''}
              onChange={(e) => {
                const product = products.find(p => p.id === e.target.value);
                if (product) {
                  onProductSelect(product);
                }
              }}
              className="w-full bg-gray-700 text-white rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#9ed04b]"
            >
              <option value="">Select a Product</option>
              {filteredProducts.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} - {product.price}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={() => setShowProductManager(true)}
              className="text-[#9ed04b] hover:underline text-sm"
            >
              Manage Products
            </button>
          </div>

          {selectedProductId && (
            <div className="bg-gray-800 rounded p-4 mt-4">
              <h4 className="font-medium mb-2">Selected Product Preview</h4>
              {getProductById(selectedProductId) && (
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 flex-shrink-0">
                    <img
                      src={getProductById(selectedProductId)?.imageUrl}
                      alt={getProductById(selectedProductId)?.name}
                      className="w-full h-full object-cover rounded"
                      onError={(e) => {
                        e.currentTarget.src = logoImage;
                      }}
                    />
                  </div>
                  <div className="flex-1 text-sm text-gray-300">
                    <p className="font-medium">{getProductById(selectedProductId)?.name}</p>
                    <p className="text-[#9ed04b]">{getProductById(selectedProductId)?.price}</p>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{getProductById(selectedProductId)?.description}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <ProductManager onSelectProduct={handleProductSelect} />
          <div className="mt-4">
            <button
              onClick={() => setShowProductManager(false)}
              className="text-gray-400 hover:text-white text-sm"
            >
              ← Back to Product Selection
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ProductSelector;