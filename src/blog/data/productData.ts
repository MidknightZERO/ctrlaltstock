import { Product } from '../../types';
import productsData from './products.json';

export const products: Product[] = productsData.products;

let affiliateProductsCache: Product[] | null = null;

/** Fetch the curated affiliate product list (single source of truth). */
export async function fetchAffiliateProducts(): Promise<Product[]> {
  if (affiliateProductsCache) return affiliateProductsCache;
  try {
    const res = await fetch('/affiliate-products.json');
    if (!res.ok) return [];
    const data = await res.json();
    const list = (data.products || []).map((p: Record<string, unknown>) => ({
      id: p.id ?? '',
      name: p.name ?? '',
      description: p.description ?? '',
      price: p.price ?? '',
      url: p.url ?? '',
      imageUrl: p.imageUrl ?? '',
      category: p.category ?? 'Electronics',
      tags: Array.isArray(p.tags) ? p.tags as string[] : [],
      inStock: true,
    })) as Product[];
    affiliateProductsCache = list;
    return list;
  } catch {
    return [];
  }
}

/** Get recommended products from the curated list by tag match. Returns up to `limit` products. */
export async function getRelatedProductsFromAffiliateList(
  tags: string[],
  limit: number = 3
): Promise<Product[]> {
  const list = await fetchAffiliateProducts();
  if (!list.length) return [];
  if (!tags.length) return list.slice(0, limit);

  const scored = list.map((product) => {
    let score = 0;
    product.tags.forEach((productTag) => {
      if (tags.some((t) => t.toLowerCase() === productTag.toLowerCase())) score += 1;
    });
    return { product, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored
    .filter((x) => x.score > 0)
    .slice(0, limit)
    .map((x) => x.product);
}

export const getProductById = (id: string): Product | undefined => {
  return products.find(product => product.id === id);
};

export const getProductsByCategory = (category: string): Product[] => {
  return products.filter(product => product.category === category);
};

export const getRelatedProducts = (tags: string[], excludeId?: string, limit: number = 3): Product[] => {
  const productScores = new Map<Product, number>();
  
  products.forEach(product => {
    if (product.id === excludeId) return;
    
    let score = 0;
    product.tags.forEach(productTag => {
      if (tags.includes(productTag)) {
        score += 1;
      }
    });
    
    if (score > 0) {
      productScores.set(product, score);
    }
  });
  
  return Array.from(productScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([product]) => product);
};

export const getAllCategories = (): string[] => {
  return Array.from(new Set(products.map(product => product.category)));
}; 