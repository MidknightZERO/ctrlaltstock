import { Product } from '../types';

// Sample products database
export const products: Product[] = [
  {
    id: "p1",
    name: "NVIDIA GeForce RTX 4090 Founders Edition",
    description: "The ultimate gaming GPU with NVIDIA Ada Lovelace architecture, 24GB of G6X memory, and incredible performance for gaming and content creation.",
    imageUrl: "https://i.imgur.com/VyjWcJd.jpg",
    price: "$1,599.99",
    retailer: "Best Buy",
    affiliateLink: "https://bestbuy.com/rtx4090",
    rating: 5,
    category: "GPU",
    tags: ["NVIDIA", "RTX 4090", "High-End"]
  },
  {
    id: "p2",
    name: "ASUS ROG Strix GeForce RTX 4080 Super OC",
    description: "Premium RTX 4080 Super with factory overclocking, enhanced cooling, and ROG design aesthetics for superior gaming performance.",
    imageUrl: "https://i.imgur.com/mHUKDyS.jpg",
    price: "$1,249.99",
    retailer: "Newegg",
    affiliateLink: "https://newegg.com/asus-rtx4080super",
    rating: 4.5,
    category: "GPU",
    tags: ["NVIDIA", "RTX 4080 Super", "ASUS", "ROG"]
  },
  {
    id: "p3",
    name: "MSI Gaming X Trio GeForce RTX 4070 Ti",
    description: "Triple-fan cooled RTX 4070 Ti with customizable RGB lighting, silent operation, and excellent 1440p and 4K gaming performance.",
    imageUrl: "https://i.imgur.com/9JxMPsY.jpg",
    price: "$899.99",
    retailer: "Amazon",
    affiliateLink: "https://amazon.com/msi-rtx4070ti",
    rating: 4.5,
    category: "GPU",
    tags: ["NVIDIA", "RTX 4070 Ti", "MSI", "Mid-Range"]
  },
  {
    id: "p4",
    name: "AMD Radeon RX 7900 XTX",
    description: "AMD's flagship GPU with 24GB VRAM, hardware raytracing, and competitive performance against NVIDIA's high-end offerings.",
    imageUrl: "https://i.imgur.com/2RdsJTu.jpg",
    price: "$949.99",
    retailer: "Amazon",
    affiliateLink: "https://amazon.com/amd-7900xtx",
    rating: 4.5,
    category: "GPU",
    tags: ["AMD", "RX 7900 XTX", "High-End"]
  },
  {
    id: "p5",
    name: "PlayStation 5 Pro Console",
    description: "Sony's upgraded PS5 with enhanced GPU performance, improved ray tracing, and support for more advanced graphical features.",
    imageUrl: "https://i.imgur.com/TRqLzYY.jpg",
    price: "$699.99",
    retailer: "PlayStation Direct",
    affiliateLink: "https://direct.playstation.com/ps5pro",
    rating: 5,
    category: "Console",
    tags: ["PlayStation", "PS5 Pro", "Sony", "Console"]
  },
  {
    id: "p6",
    name: "Xbox Series X Console",
    description: "Microsoft's flagship gaming console with 4K gaming, fast loading times, and access to Xbox Game Pass.",
    imageUrl: "https://i.imgur.com/dJCIufs.jpg",
    price: "$499.99",
    retailer: "Microsoft Store",
    affiliateLink: "https://microsoft.com/xbox-series-x",
    rating: 4.5,
    category: "Console",
    tags: ["Xbox", "Series X", "Microsoft", "Console"]
  },
  {
    id: "p7",
    name: "Steam Deck OLED 512GB",
    description: "Valve's handheld gaming PC with a vibrant OLED display, improved battery life, and access to thousands of Steam games on the go.",
    imageUrl: "https://i.imgur.com/e7BYx3Z.jpg",
    price: "$649.00",
    retailer: "Steam",
    affiliateLink: "https://store.steampowered.com/steamdeck",
    rating: 4.5,
    category: "Handheld",
    tags: ["Steam Deck", "OLED", "Valve", "Handheld"]
  },
  {
    id: "p8",
    name: "ASUS ROG Ally Handheld Gaming PC",
    description: "Windows-based handheld gaming PC with AMD Ryzen processor, 7-inch display, and compatibility with multiple game stores.",
    imageUrl: "https://i.imgur.com/x0ByKAF.jpg",
    price: "$699.99",
    retailer: "Best Buy",
    affiliateLink: "https://bestbuy.com/asus-rog-ally",
    rating: 4,
    category: "Handheld",
    tags: ["ROG Ally", "ASUS", "Handheld", "Windows"]
  },
  {
    id: "p9",
    name: "GIGABYTE GeForce RTX 4060 Ti Gaming OC",
    description: "Energy-efficient RTX 4060 Ti with excellent 1080p and 1440p performance, compact design, and GIGABYTE's Windforce cooling.",
    imageUrl: "https://i.imgur.com/IyrWMsx.jpg",
    price: "$399.99",
    retailer: "Newegg",
    affiliateLink: "https://newegg.com/gigabyte-rtx4060ti",
    rating: 4,
    category: "GPU",
    tags: ["NVIDIA", "RTX 4060 Ti", "GIGABYTE", "Budget"]
  },
  {
    id: "p10",
    name: "Sapphire NITRO+ AMD Radeon RX 7800 XT",
    description: "Factory overclocked RX 7800 XT with Sapphire's premium cooling solution, offering excellent performance for 1440p and entry-level 4K gaming.",
    imageUrl: "https://i.imgur.com/MN9BhG2.jpg",
    price: "$549.99",
    retailer: "Amazon",
    affiliateLink: "https://amazon.com/sapphire-rx7800xt",
    rating: 4.5,
    category: "GPU",
    tags: ["AMD", "RX 7800 XT", "Sapphire", "Mid-Range"]
  }
];

// Get all products
export const getAllProducts = (): Product[] => {
  return products;
};

// Get product by ID
export const getProductById = (id: string): Product | undefined => {
  return products.find(product => product.id === id);
};

// Get products by category
export const getProductsByCategory = (category: string): Product[] => {
  return products.filter(product => product.category === category);
};

// Get products by tag
export const getProductsByTag = (tag: string): Product[] => {
  return products.filter(product => product.tags.includes(tag));
};

// Get products by multiple tags (AND logic)
export const getProductsByTags = (tags: string[]): Product[] => {
  return products.filter(product => 
    tags.every(tag => product.tags.includes(tag))
  );
};

// Get related products - products sharing tags with the provided product
export const getRelatedProducts = (productId: string, limit: number = 3): Product[] => {
  const product = getProductById(productId);
  if (!product) return [];
  
  // Find products sharing at least one tag, excluding the original product
  const related = products
    .filter(p => 
      p.id !== productId && 
      p.tags.some(tag => product.tags.includes(tag))
    )
    .sort((a, b) => {
      // Count matching tags to sort by relevance
      const aMatchCount = a.tags.filter(tag => product.tags.includes(tag)).length;
      const bMatchCount = b.tags.filter(tag => product.tags.includes(tag)).length;
      return bMatchCount - aMatchCount;
    });
  
  return related.slice(0, limit);
}; 