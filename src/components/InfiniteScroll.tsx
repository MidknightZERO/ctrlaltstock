import React from 'react';

// Expanded product list with real-world tech products
const PRODUCTS = [
  {
    name: "NVIDIA GeForce RTX 4090",
    image: "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&q=80&w=2940&ixlib=rb-4.0.3"
  },
  {
    name: "NVIDIA GeForce RTX 4080",
    image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&q=80&w=2940&ixlib=rb-4.0.3"
  },
  {
    name: "AMD Radeon RX 7900 XTX",
    image: "https://images.unsplash.com/photo-1592664474505-51c549ad15c5?auto=format&fit=crop&q=80&w=2940&ixlib=rb-4.0.3"
  },
  {
    name: "PlayStation 5",
    image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&q=80&w=2940&ixlib=rb-4.0.3"
  },
  {
    name: "Xbox Series X",
    image: "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&q=80&w=2940&ixlib=rb-4.0.3"
  },
  {
    name: "AMD Ryzen 9 7950X",
    image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&q=80&w=2940&ixlib=rb-4.0.3"
  },
  {
    name: "Intel Core i9-14900K",
    image: "https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&q=80&w=2940&ixlib=rb-4.0.3"
  },
  {
    name: "ASUS ROG STRIX 850W PSU",
    image: "https://images.unsplash.com/photo-1587202372162-638fa1791a43?auto=format&fit=crop&q=80&w=2940&ixlib=rb-4.0.3"
  },
  {
    name: "Samsung 990 PRO 2TB SSD",
    image: "https://images.unsplash.com/photo-1628557010340-011de0470eb7?auto=format&fit=crop&q=80&w=2940&ixlib=rb-4.0.3"
  },
  {
    name: "G.SKILL Trident Z5 RGB 32GB",
    image: "https://images.unsplash.com/photo-1592664474496-8b60c8c4b238?auto=format&fit=crop&q=80&w=2940&ixlib=rb-4.0.3"
  }
];

// Duplicate the products to create a seamless loop
const SCROLLING_PRODUCTS = [...PRODUCTS, ...PRODUCTS];

export function InfiniteScroll() {
  return (
    <div className="relative overflow-hidden">
      <div className="flex animate-scroll">
        {SCROLLING_PRODUCTS.map((product, index) => (
          <div
            key={`${product.name}-${index}`}
            className="w-[300px] flex-shrink-0 mx-4"
          >
            <div className="bg-gray-800 rounded-lg overflow-hidden hover:transform hover:scale-105 transition-transform">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <h3 className="text-xl font-semibold">{product.name}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}