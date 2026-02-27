import { Product } from '../../types';

export const products: Product[] = [
  // GPU Comparison Guide Products
  {
    id: "p1",
    name: "NVIDIA GeForce RTX 4090 Founders Edition",
    description: "The ultimate graphics card for 4K gaming and content creation",
    price: "£1,699.00",
    url: "https://www.amazon.co.uk/NVIDIA-GeForce-RTX-4090-Founders/dp/B0BF5HPX8V",
    imageUrl: "https://images.nvidia.com/aem-dam/Solutions/geforce/ada/rtx-4090/geforce-rtx-4090-product-gallery-full-screen-3840-2.jpg",
    category: "GPU",
    tags: ["NVIDIA", "RTX 4090", "4K Gaming", "High-End GPU"],
    inStock: true
  },
  {
    id: "p2",
    name: "AMD Radeon RX 7900 XTX",
    description: "High-performance graphics card with excellent price-to-performance ratio",
    price: "£989.99",
    url: "https://www.amazon.co.uk/AMD-Radeon-RX-7900-XTX/dp/B0BMQJ4JQF",
    imageUrl: "https://www.amd.com/system/files/2022-11/1728141-radeon-rx-7900xtx-left-angle-1260x709.png",
    category: "GPU",
    tags: ["AMD", "RX 7900 XTX", "4K Gaming", "High-End GPU"],
    inStock: true
  },
  {
    id: "p3",
    name: "NVIDIA GeForce RTX 4070 Ti",
    description: "Perfect balance of performance and value for 1440p gaming",
    price: "£799.99",
    url: "https://www.amazon.co.uk/NVIDIA-GeForce-RTX-4070-Ti/dp/B0BNJ6XBQQ",
    imageUrl: "https://images.nvidia.com/aem-dam/Solutions/geforce/ada/rtx-4070-ti/geforce-rtx-4070-ti-product-gallery-full-screen-3840-2.jpg",
    category: "GPU",
    tags: ["NVIDIA", "RTX 4070 Ti", "1440p Gaming", "Mid-Range GPU"],
    inStock: true
  },

  // PS5 Pro Related Products
  {
    id: "p4",
    name: "Sony PlayStation 5 Console",
    description: "Current generation gaming console with impressive performance",
    price: "£479.99",
    url: "https://www.amazon.co.uk/PlayStation-5-Console/dp/B08H95Y452",
    imageUrl: "https://images-na.ssl-images-amazon.com/images/I/71PMC4DWWFL._AC_SL1500_.jpg",
    category: "Console",
    tags: ["PlayStation", "PS5", "Gaming Console"],
    inStock: true
  },
  {
    id: "p5",
    name: "Samsung 65-inch OLED 4K TV",
    description: "Perfect for next-gen gaming with HDMI 2.1 and 120Hz support",
    price: "£1,799.00",
    url: "https://www.amazon.co.uk/Samsung-65-inch-QN65S95B-Gaming-Smart/dp/B09Y2WRWQ9",
    imageUrl: "https://images.samsung.com/is/image/samsung/p6pim/uk/qe65s95bauxru/gallery/uk-oled-s95b-qe65s95bauxru-531504476",
    category: "TV",
    tags: ["4K TV", "OLED", "Gaming TV", "HDMI 2.1"],
    inStock: true
  },
  {
    id: "p6",
    name: "PlayStation VR2",
    description: "Next-generation VR headset for PlayStation 5",
    price: "£529.99",
    url: "https://www.amazon.co.uk/PlayStation-VR2/dp/B0BPC66DZX",
    imageUrl: "https://images.pushsquare.com/7748e0567c8ba/ps-vr2-guide-1.large.jpg",
    category: "VR",
    tags: ["PlayStation", "VR", "Gaming", "PS5"],
    inStock: true
  },

  // Tech Trends Products
  {
    id: "p7",
    name: "Intel Core i9-14900K",
    description: "Latest generation flagship CPU for high-performance computing",
    price: "£599.99",
    url: "https://www.amazon.co.uk/Intel-i9-14900K-Desktop-Processor-Unlocked/dp/B0CGXQX6XG",
    imageUrl: "https://www.intel.com/content/dam/www/central-libraries/us/en/images/2023-08/14th-gen-core-chip-rwd.png.rendition.intel.web.864.486.png",
    category: "CPU",
    tags: ["Intel", "CPU", "Gaming", "Content Creation"],
    inStock: true
  },
  {
    id: "p8",
    name: "Samsung 990 PRO 4TB NVMe SSD",
    description: "Ultra-fast PCIe 4.0 SSD for gaming and content creation",
    price: "£329.99",
    url: "https://www.amazon.co.uk/Samsung-990-PRO-Internal-MZ-V9P4T0BW/dp/B0BHJJ9Y77",
    imageUrl: "https://images.samsung.com/is/image/samsung/p6pim/uk/mz-v9p4t0bw/gallery/uk-990-pro-nvme-ssd-mz-v9p4t0bw-534686384",
    category: "Storage",
    tags: ["SSD", "Storage", "PCIe 4.0", "High Performance"],
    inStock: true
  },
  {
    id: "p9",
    name: "ASUS ROG Swift OLED PG27AQDM",
    description: "27-inch 1440p OLED gaming monitor with 240Hz refresh rate",
    price: "£899.99",
    url: "https://www.amazon.co.uk/ASUS-PG27AQDM-Compatible-DisplayHDR-Adjustable/dp/B0BR4XVH8G",
    imageUrl: "https://dlcdnwebimgs.asus.com/gain/D76E2CCE-88FF-4A47-B7F5-4F7C2BB99C03/w1000/h732",
    category: "Monitor",
    tags: ["Monitor", "OLED", "Gaming", "High Refresh Rate"],
    inStock: true
  }
];

export const getProductById = (id: string): Product | undefined => {
  return products.find(product => product.id === id);
};

export const getRelatedProducts = (tags: string[], excludeId?: string, limit: number = 3): Product[] => {
  // Create a map to score products based on matching tags
  const productScores = new Map<Product, number>();
  
  products.forEach(product => {
    if (product.id === excludeId) return;
    
    let score = 0;
    if (product.tags) {
      product.tags.forEach(productTag => {
        if (tags.includes(productTag)) {
          score += 1;
        }
      });
    }
    
    if (score > 0) {
      productScores.set(product, score);
    }
  });
  
  // Sort products by score and return the top matches
  return Array.from(productScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([product]) => product);
}; 