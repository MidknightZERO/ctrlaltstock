import React from 'react';

const DISCORD_INVITE = 'https://discord.gg/MqqbyJJbvC';

// Current-gen hardware we track most closely
const PRODUCTS = [
  {
    name: 'NVIDIA GeForce RTX 5090',
    description: 'Flagship next-gen GPU for 4K & path tracing',
    image:
      'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&q=80&w=1600&ixlib=rb-4.0.3',
  },
  {
    name: 'NVIDIA GeForce RTX 5080',
    description: 'High-end value pick for enthusiasts',
    image:
      'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&q=80&w=1600&ixlib=rb-4.0.3',
  },
  {
    name: 'AMD Radeon RX 9000 XTX',
    description: 'AMD’s latest flagship for high-refresh 4K',
    image:
      'https://images.unsplash.com/photo-1592664474505-51c549ad15c5?auto=format&fit=crop&q=80&w=1600&ixlib=rb-4.0.3',
  },
  {
    name: 'AMD Ryzen 9 9950X',
    description: 'Zen 5 powerhouse for gaming & creation',
    image:
      'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&q=80&w=1600&ixlib=rb-4.0.3',
  },
  {
    name: 'Intel Core i9-15900K',
    description: 'Latest Intel desktop flagship CPU',
    image:
      'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&q=80&w=1600&ixlib=rb-4.0.3',
  },
  {
    name: 'PlayStation 5 Pro',
    description: 'Sony’s 4K120 console refresh',
    image:
      'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&q=80&w=1600&ixlib=rb-4.0.3',
  },
  {
    name: 'Xbox Series X',
    description: 'Microsoft’s 4K HDR console',
    image:
      'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&q=80&w=1600&ixlib=rb-4.0.3',
  },
  {
    name: '32GB DDR5 Gaming RAM',
    description: 'High-speed RGB kit for modern builds',
    image:
      'https://images.unsplash.com/photo-1592664474496-8b60c8c4b238?auto=format&fit=crop&q=80&w=1600&ixlib=rb-4.0.3',
  },
  {
    name: 'Samsung 990 PRO 2TB SSD',
    description: 'PCIe 4.0 NVMe for games & creators',
    image:
      'https://images.unsplash.com/photo-1628557010340-011de0470eb7?auto=format&fit=crop&q=80&w=1600&ixlib=rb-4.0.3',
  },
];

// Duplicate the products to create a seamless loop
const SCROLLING_PRODUCTS = [...PRODUCTS, ...PRODUCTS];

export function InfiniteScroll() {
  return (
    <div className="relative overflow-hidden">
      <div className="flex animate-scroll">
        {SCROLLING_PRODUCTS.map((product, index) => (
          <a
            key={`${product.name}-${index}`}
            href={DISCORD_INVITE}
            target="_blank"
            rel="noopener noreferrer"
            className="w-[300px] flex-shrink-0 mx-4"
          >
            <div className="bg-gray-800 rounded-lg overflow-hidden hover:transform hover:scale-105 transition-transform cursor-pointer">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-1">{product.name}</h3>
                {product.description && (
                  <p className="text-sm text-gray-400">
                    {product.description}
                  </p>
                )}
                <p className="mt-3 text-[#9ed04b] text-sm font-medium">
                  Join Discord to track stock →
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}