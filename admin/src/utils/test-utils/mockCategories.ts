import { ICategory } from '@src/entity/Category/Category';
import { EntityStatus, ListingSort } from '@src/graphql';
import { makeMockFile } from './locales';

const now = new Date();
const yesterday = new Date(Date.now() - 86400000);

export const createMockCategory = (
  overrides: Partial<ICategory> = {},
  index: number = 0,
): ICategory => ({
  id: `category-${index + 1}`,
  title: `Category ${index + 1}`,
  description: `Description for Category ${index + 1}`,
  excerpt: `Short excerpt for Category ${index + 1}`,
  slug: `category-${index + 1}`,
  status: EntityStatus.Published,
  subcategories: [],
  parents: [],
  cover: makeMockFile({ id: index + 100, url: `https://picsum.photos/seed/cat${index}/400/400` }),
  gallery: [],
  createdAt: yesterday,
  updatedAt: now,
  listingOrderBy: ListingSort.CreatedAtDesc,
  listingOrderByStatus: true,
  includeChildrenProducts: true,
  listingPlacement: index,
  seoTitle: `SEO Title for Category ${index + 1}`,
  seoDescription: `SEO Description for Category ${index + 1}`,
  __typename: 'Category',
  ...overrides,
});

// Pre-defined mock categories with hierarchy
export const mockCategories: ICategory[] = [
  createMockCategory({
    id: 'cat-electronics',
    title: 'Electronics',
    description: 'Electronic devices and gadgets',
    excerpt: 'All electronic products',
    slug: 'electronics',
    cover: makeMockFile({ id: 101, url: 'https://picsum.photos/seed/electronics/400/400' }),
    subcategories: [],
  }, 0),

  createMockCategory({
    id: 'cat-smartphones',
    title: 'Smartphones',
    description: 'Mobile phones and accessories',
    excerpt: 'Latest smartphones',
    slug: 'smartphones',
    cover: makeMockFile({ id: 102, url: 'https://picsum.photos/seed/smartphones/400/400' }),
    parents: [{ id: 'cat-electronics', title: 'Electronics', slug: 'electronics' }],
  }, 1),

  createMockCategory({
    id: 'cat-laptops',
    title: 'Laptops',
    description: 'Portable computers for work and play',
    excerpt: 'Laptops and notebooks',
    slug: 'laptops',
    cover: makeMockFile({ id: 103, url: 'https://picsum.photos/seed/laptops/400/400' }),
    parents: [{ id: 'cat-electronics', title: 'Electronics', slug: 'electronics' }],
  }, 2),

  createMockCategory({
    id: 'cat-tablets',
    title: 'Tablets',
    description: 'Tablets and e-readers',
    excerpt: 'Tablets for everyone',
    slug: 'tablets',
    cover: makeMockFile({ id: 104, url: 'https://picsum.photos/seed/tablets/400/400' }),
    parents: [{ id: 'cat-electronics', title: 'Electronics', slug: 'electronics' }],
  }, 3),

  createMockCategory({
    id: 'cat-audio',
    title: 'Audio',
    description: 'Headphones, speakers, and audio equipment',
    excerpt: 'Audio devices',
    slug: 'audio',
    cover: makeMockFile({ id: 105, url: 'https://picsum.photos/seed/audio/400/400' }),
    parents: [{ id: 'cat-electronics', title: 'Electronics', slug: 'electronics' }],
  }, 4),

  createMockCategory({
    id: 'cat-wearables',
    title: 'Wearables',
    description: 'Smartwatches and fitness trackers',
    excerpt: 'Wearable technology',
    slug: 'wearables',
    cover: makeMockFile({ id: 106, url: 'https://picsum.photos/seed/wearables/400/400' }),
    parents: [{ id: 'cat-electronics', title: 'Electronics', slug: 'electronics' }],
  }, 5),

  createMockCategory({
    id: 'cat-gaming',
    title: 'Gaming',
    description: 'Gaming consoles, accessories, and games',
    excerpt: 'Gaming equipment',
    slug: 'gaming',
    cover: makeMockFile({ id: 107, url: 'https://picsum.photos/seed/gaming/400/400' }),
  }, 6),

  createMockCategory({
    id: 'cat-home',
    title: 'Home & Appliances',
    description: 'Home appliances and smart home devices',
    excerpt: 'Home products',
    slug: 'home-appliances',
    cover: makeMockFile({ id: 108, url: 'https://picsum.photos/seed/home/400/400' }),
  }, 7),

  createMockCategory({
    id: 'cat-clothing',
    title: 'Clothing',
    description: 'Fashion and apparel',
    excerpt: 'Clothes and accessories',
    slug: 'clothing',
    cover: makeMockFile({ id: 109, url: 'https://picsum.photos/seed/clothing/400/400' }),
  }, 8),

  createMockCategory({
    id: 'cat-accessories',
    title: 'Accessories',
    description: 'Phone cases, cables, and other accessories',
    excerpt: 'Product accessories',
    slug: 'accessories',
    cover: makeMockFile({ id: 110, url: 'https://picsum.photos/seed/accessories/400/400' }),
  }, 9),
];

// Update electronics category with subcategories
mockCategories[0].subcategories = [
  mockCategories[1], // Smartphones
  mockCategories[2], // Laptops
  mockCategories[3], // Tablets
  mockCategories[4], // Audio
  mockCategories[5], // Wearables
];

// Helper to generate many categories
export const generateMockCategories = (count: number): ICategory[] => {
  return Array.from({ length: count }, (_, i) => createMockCategory({}, i));
};

export const mockCategoriesWithMeta = {
  data: mockCategories,
  meta: {
    page: 1,
    pageSize: 25,
    count: mockCategories.length,
    total: mockCategories.length,
    pageCount: 1,
  },
};

// Flat list for select/dropdown components
export const mockCategoriesFlat: ICategory[] = mockCategories.map((cat) => ({
  ...cat,
  subcategories: [],
}));
