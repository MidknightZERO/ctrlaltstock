import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { products, getAllCategories, getProductById } from '../data/productData';
import { Plus, Edit, Trash, Save, X } from 'lucide-react';
import logoImage from '../../images/Logo.png';

interface ProductManagerProps {
  onSelectProduct: (product: Product) => void;
}

const ProductManager: React.FC<ProductManagerProps> = ({ onSelectProduct }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const categories = getAllCategories();

  // New product form state
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    id: '',
    name: '',
    description: '',
    price: '',
    imageUrl: '',
    category: '',
    inStock: true,
    tags: [],
    url: ''
  });

  useEffect(() => {
    if (selectedCategory) {
      setFilteredProducts(products.filter(p => p.category === selectedCategory));
    } else {
      setFilteredProducts(products);
    }
  }, [selectedCategory]);

  const handleAddProduct = () => {
    setIsAddingProduct(true);
    setIsEditingProduct(false);
    setSelectedProductId(null);
    setNewProduct({
      id: `p${products.length + 1}`,
      name: '',
      description: '',
      price: '',
      imageUrl: '',
      category: selectedCategory || '',
      inStock: true,
      tags: [],
      url: ''
    });
  };

  const handleEditProduct = (productId: string) => {
    const product = getProductById(productId);
    if (product) {
      setIsAddingProduct(false);
      setIsEditingProduct(true);
      setSelectedProductId(productId);
      setNewProduct({ ...product });
    }
  };

  const handleSaveProduct = () => {
    // In a real application, this would save to a database or API
    // For now, we'll just log it
    console.log('Saving product:', newProduct);
    
    // Reset the form
    setIsAddingProduct(false);
    setIsEditingProduct(false);
    setSelectedProductId(null);
    
    // Refresh the product list
    if (selectedCategory) {
      setFilteredProducts(products.filter(p => p.category === selectedCategory));
    } else {
      setFilteredProducts(products);
    }
  };

  const handleCancelEdit = () => {
    setIsAddingProduct(false);
    setIsEditingProduct(false);
    setSelectedProductId(null);
  };

  const handleInputChange = (field: keyof Product, value: any) => {
    setNewProduct(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTagsChange = (tagsString: string) => {
    const tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    setNewProduct(prev => ({
      ...prev,
      tags
    }));
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Product Manager</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Filter by Category
        </label>
        <div className="flex gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="flex-1 bg-gray-700 text-white rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#9ed04b]"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddProduct}
            className="bg-[#9ed04b] hover:bg-[#9ed04b]/90 text-gray-900 px-3 py-2 rounded flex items-center text-sm transition-colors"
          >
            <Plus size={16} className="mr-1" />
            Add Product
          </button>
        </div>
      </div>
      
      {(isAddingProduct || isEditingProduct) && (
        <div className="mb-6 bg-gray-700 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {isAddingProduct ? 'Add New Product' : 'Edit Product'}
            </h3>
            <button
              onClick={handleCancelEdit}
              className="text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Product Name
              </label>
              <input
                type="text"
                value={newProduct.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full bg-gray-600 text-white rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#9ed04b]"
                placeholder="Product Name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Price
              </label>
              <input
                type="text"
                value={newProduct.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                className="w-full bg-gray-600 text-white rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#9ed04b]"
                placeholder="£99.99"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Category
              </label>
              <select
                value={newProduct.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full bg-gray-600 text-white rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#9ed04b]"
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Image URL
              </label>
              <input
                type="text"
                value={newProduct.imageUrl}
                onChange={(e) => handleInputChange('imageUrl', e.target.value)}
                className="w-full bg-gray-600 text-white rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#9ed04b]"
                placeholder="https://example.com/image.jpg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Product URL
              </label>
              <input
                type="text"
                value={newProduct.url}
                onChange={(e) => handleInputChange('url', e.target.value)}
                className="w-full bg-gray-600 text-white rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#9ed04b]"
                placeholder="https://example.com/product"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={newProduct.tags?.join(', ')}
                onChange={(e) => handleTagsChange(e.target.value)}
                className="w-full bg-gray-600 text-white rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#9ed04b]"
                placeholder="tag1, tag2, tag3"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={newProduct.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full bg-gray-600 text-white rounded p-2 min-h-[100px] focus:outline-none focus:ring-1 focus:ring-[#9ed04b]"
                placeholder="Product description..."
              />
            </div>
            
            <div className="md:col-span-2 flex justify-between items-center">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="inStock"
                  checked={newProduct.inStock}
                  onChange={(e) => handleInputChange('inStock', e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="inStock" className="text-sm text-gray-300">
                  In Stock
                </label>
              </div>
              
              <button
                onClick={handleSaveProduct}
                className="bg-[#9ed04b] hover:bg-[#9ed04b]/90 text-gray-900 px-4 py-2 rounded flex items-center text-sm transition-colors"
              >
                <Save size={16} className="mr-2" />
                Save Product
              </button>
            </div>
          </div>
          
          {newProduct.imageUrl && (
            <div className="mt-4 p-2 bg-gray-800 rounded">
              <p className="text-sm text-gray-400 mb-2">Image Preview:</p>
              <img
                src={newProduct.imageUrl}
                alt={newProduct.name}
                className="max-h-40 object-contain mx-auto"
                onError={(e) => {
                  e.currentTarget.src = logoImage;
                }}
              />
            </div>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map(product => (
          <div key={product.id} className="bg-gray-700 rounded-lg overflow-hidden">
            <div className="h-40 overflow-hidden">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = logoImage;
                }}
              />
            </div>
            <div className="p-4">
              <h3 className="font-semibold mb-1 truncate">{product.name}</h3>
              <p className="text-[#9ed04b] font-bold mb-2">{product.price}</p>
              <p className="text-sm text-gray-400 mb-3 line-clamp-2">{product.description}</p>
              
              <div className="flex justify-between">
                <button
                  onClick={() => onSelectProduct(product)}
                  className="bg-[#9ed04b] hover:bg-[#9ed04b]/90 text-gray-900 px-3 py-1 rounded text-sm transition-colors"
                >
                  Select
                </button>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditProduct(product.id)}
                    className="text-gray-400 hover:text-white"
                  >
                    <Edit size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {filteredProducts.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          No products found. {selectedCategory ? `Try selecting a different category or ` : ''}
          <button
            onClick={handleAddProduct}
            className="text-[#9ed04b] hover:underline"
          >
            add a new product
          </button>.
        </div>
      )}
    </div>
  );
};

export default ProductManager;
