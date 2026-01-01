import { ICategory } from '@src/entity/Category/Category';
import { IProduct } from '@src/entity/Product/Product';
import { IProductVariant } from '@src/entity/Product/Variant';
import {
  DimensionUnit,
  EntityStatus,
  ListingSort,
  WeightUnit,
} from '@src/graphql';
import { makeMockFile } from './locales';

const now = new Date();
const yesterday = new Date(Date.now() - 86400000);

// Inline category for products to avoid circular dependency
const electronicsCategory: ICategory = {
  id: 'cat-electronics',
  title: 'Electronics',
  description: 'Electronic devices and gadgets',
  excerpt: 'All electronic products',
  slug: 'electronics',
  status: EntityStatus.Published,
  subcategories: [],
  parents: [],
  cover: makeMockFile({ id: 101, url: 'https://picsum.photos/seed/electronics/400/400' }),
  gallery: [],
  createdAt: yesterday,
  updatedAt: now,
  listingOrderBy: ListingSort.CreatedAtDesc,
  listingOrderByStatus: true,
  includeChildrenProducts: true,
  listingPlacement: 0,
  seoTitle: 'Electronics',
  seoDescription: 'Electronic devices and gadgets',
  __typename: 'Category',
};

export const createMockVariant = (
  overrides: Partial<IProductVariant> = {},
  index: number = 0,
): IProductVariant => ({
  id: `variant-${index + 1}`,
  containerId: overrides.containerId || 'product-1',
  title: `Variant ${index + 1}`,
  categories: [],
  container: null,
  costPrice: 1000,
  cover: makeMockFile({ id: index + 1, url: `https://picsum.photos/seed/variant${index}/400/400` }),
  createdAt: yesterday,
  gallery: [],
  inListing: true,
  isVariant: true,
  oldPrice: 0,
  options: [],
  price: 1999,
  sku: `SKU-VAR-${index + 1}`,
  slug: `variant-${index + 1}`,
  status: EntityStatus.Published,
  stockStatus: 'IN_STOCK',
  updatedAt: now,
  weight: 500,
  weightUnit: WeightUnit.Gr,
  length: 100,
  width: 50,
  height: 30,
  dimensionUnit: DimensionUnit.Mm,
  variantSortIndex: index,
  __typename: 'Variant',
  ...overrides,
});

export const createMockProduct = (
  overrides: Partial<IProduct> = {},
  index: number = 0,
): IProduct => {
  const id = overrides.id || `product-${index + 1}`;
  const embedVariant = createMockVariant({ containerId: id }, 0);

  return {
    id,
    containerId: id,
    title: `Product ${index + 1}`,
    description: `This is a description for Product ${index + 1}. It contains detailed information about the product.`,
    excerpt: `Short excerpt for Product ${index + 1}`,
    slug: `product-${index + 1}`,
    status: EntityStatus.Published,
    stockStatus: 'IN_STOCK',
    price: 1999,
    oldPrice: 2499,
    costPrice: 1000,
    sku: `SKU-${index + 1}`,
    cover: makeMockFile({ id: index + 1, url: `https://picsum.photos/seed/product${index}/400/400` }),
    gallery: [
      makeMockFile({ id: (index + 1) * 10, url: `https://picsum.photos/seed/gallery${index}a/400/400` }),
      makeMockFile({ id: (index + 1) * 10 + 1, url: `https://picsum.photos/seed/gallery${index}b/400/400` }),
    ],
    categories: index < 3 ? [electronicsCategory] : [],
    primaryCategory: index < 3 ? { id: electronicsCategory.id, title: electronicsCategory.title } : null,
    attributes: [],
    options: [],
    groups: [],
    tags: [],
    variants: [],
    container: null,
    createdAt: yesterday,
    updatedAt: now,
    weight: 500,
    weightUnit: WeightUnit.Gr,
    length: 100,
    width: 50,
    height: 30,
    dimensionUnit: DimensionUnit.Mm,
    requiresShipping: true,
    seoTitle: `SEO Title for Product ${index + 1}`,
    seoDescription: `SEO Description for Product ${index + 1}`,
    isVariant: false,
    variantId: embedVariant.id,
    embedVariant,
    isVariableProduct: false,
    __typename: 'ProductContainer',
    ...overrides,
  };
};

// Pre-defined mock products
export const mockProducts: IProduct[] = [
  createMockProduct({
    id: 'prod-1',
    title: 'iPhone 15 Pro Max',
    description: 'Latest Apple smartphone with A17 Pro chip, titanium design, and advanced camera system.',
    excerpt: 'Premium smartphone with titanium design',
    slug: 'iphone-15-pro-max',
    price: 119999,
    oldPrice: 129999,
    costPrice: 80000,
    sku: 'APPLE-IP15PM-256',
    cover: makeMockFile({ id: 1, url: 'https://picsum.photos/seed/iphone/400/400' }),
  }, 0),

  createMockProduct({
    id: 'prod-2',
    title: 'MacBook Pro 14"',
    description: 'Professional laptop with M3 Pro chip, Liquid Retina XDR display, and all-day battery life.',
    excerpt: 'Professional laptop for creators',
    slug: 'macbook-pro-14',
    price: 199999,
    oldPrice: 0,
    costPrice: 150000,
    sku: 'APPLE-MBP14-M3P',
    cover: makeMockFile({ id: 2, url: 'https://picsum.photos/seed/macbook/400/400' }),
  }, 1),

  createMockProduct({
    id: 'prod-3',
    title: 'AirPods Pro 2',
    description: 'Active Noise Cancellation, Adaptive Audio, and Personalized Spatial Audio.',
    excerpt: 'Premium wireless earbuds',
    slug: 'airpods-pro-2',
    price: 24999,
    oldPrice: 27999,
    costPrice: 15000,
    sku: 'APPLE-APP2',
    cover: makeMockFile({ id: 3, url: 'https://picsum.photos/seed/airpods/400/400' }),
  }, 2),

  createMockProduct({
    id: 'prod-4',
    title: 'Samsung Galaxy S24 Ultra',
    description: 'Ultimate smartphone with Galaxy AI, 200MP camera, and S Pen included.',
    excerpt: 'AI-powered flagship smartphone',
    slug: 'samsung-galaxy-s24-ultra',
    price: 129999,
    oldPrice: 0,
    costPrice: 90000,
    sku: 'SAMSUNG-S24U-256',
    cover: makeMockFile({ id: 4, url: 'https://picsum.photos/seed/samsung/400/400' }),
  }, 3),

  createMockProduct({
    id: 'prod-5',
    title: 'Sony WH-1000XM5',
    description: 'Industry-leading noise canceling headphones with exceptional sound quality.',
    excerpt: 'Premium noise-canceling headphones',
    slug: 'sony-wh-1000xm5',
    price: 39999,
    oldPrice: 44999,
    costPrice: 25000,
    sku: 'SONY-WH1000XM5',
    cover: makeMockFile({ id: 5, url: 'https://picsum.photos/seed/sony/400/400' }),
  }, 4),

  createMockProduct({
    id: 'prod-6',
    title: 'iPad Pro 12.9"',
    description: 'Most advanced iPad with M2 chip, Liquid Retina XDR display, and Apple Pencil support.',
    excerpt: 'Professional tablet for creators',
    slug: 'ipad-pro-12-9',
    price: 109999,
    oldPrice: 119999,
    costPrice: 75000,
    sku: 'APPLE-IPADP-129',
    cover: makeMockFile({ id: 6, url: 'https://picsum.photos/seed/ipad/400/400' }),
  }, 5),

  createMockProduct({
    id: 'prod-7',
    title: 'Apple Watch Ultra 2',
    description: 'Most rugged and capable Apple Watch with precision dual-frequency GPS.',
    excerpt: 'Adventure-ready smartwatch',
    slug: 'apple-watch-ultra-2',
    price: 79999,
    oldPrice: 0,
    costPrice: 50000,
    sku: 'APPLE-AWU2',
    cover: makeMockFile({ id: 7, url: 'https://picsum.photos/seed/watch/400/400' }),
  }, 6),

  createMockProduct({
    id: 'prod-8',
    title: 'Dyson V15 Detect',
    description: 'Most powerful cordless vacuum with laser dust detection and piezo sensor.',
    excerpt: 'Smart cordless vacuum cleaner',
    slug: 'dyson-v15-detect',
    price: 74999,
    oldPrice: 79999,
    costPrice: 45000,
    sku: 'DYSON-V15D',
    cover: makeMockFile({ id: 8, url: 'https://picsum.photos/seed/dyson/400/400' }),
  }, 7),

  createMockProduct({
    id: 'prod-9',
    title: 'PlayStation 5',
    description: 'Next-gen gaming console with ultra-high speed SSD and 4K gaming.',
    excerpt: 'Next-generation gaming console',
    slug: 'playstation-5',
    price: 49999,
    oldPrice: 54999,
    costPrice: 35000,
    sku: 'SONY-PS5',
    cover: makeMockFile({ id: 9, url: 'https://picsum.photos/seed/ps5/400/400' }),
  }, 8),

  createMockProduct({
    id: 'prod-10',
    title: 'Nintendo Switch OLED',
    description: 'Versatile gaming system with vibrant 7-inch OLED screen.',
    excerpt: 'Portable gaming system',
    slug: 'nintendo-switch-oled',
    price: 34999,
    oldPrice: 0,
    costPrice: 22000,
    sku: 'NINTENDO-SW-OLED',
    cover: makeMockFile({ id: 10, url: 'https://picsum.photos/seed/switch/400/400' }),
  }, 9),
];

// Variable product with variants example
export const mockVariableProduct: IProduct = {
  ...createMockProduct({
    id: 'prod-variable-1',
    title: 'T-Shirt Classic',
    description: 'Premium cotton t-shirt available in multiple sizes and colors.',
    excerpt: 'Classic cotton t-shirt',
    slug: 't-shirt-classic',
    price: 2999,
    oldPrice: 0,
    costPrice: 1500,
    sku: 'TSHIRT-CLASSIC',
    isVariableProduct: true,
    variantId: null,
    embedVariant: null,
  }, 100),
  variants: [
    createMockVariant({
      id: 'var-1',
      containerId: 'prod-variable-1',
      title: 'Small / Red',
      price: 2999,
      sku: 'TSHIRT-S-RED',
    }, 0),
    createMockVariant({
      id: 'var-2',
      containerId: 'prod-variable-1',
      title: 'Medium / Red',
      price: 2999,
      sku: 'TSHIRT-M-RED',
    }, 1),
    createMockVariant({
      id: 'var-3',
      containerId: 'prod-variable-1',
      title: 'Large / Red',
      price: 2999,
      sku: 'TSHIRT-L-RED',
    }, 2),
    createMockVariant({
      id: 'var-4',
      containerId: 'prod-variable-1',
      title: 'Small / Blue',
      price: 2999,
      sku: 'TSHIRT-S-BLUE',
    }, 3),
    createMockVariant({
      id: 'var-5',
      containerId: 'prod-variable-1',
      title: 'Medium / Blue',
      price: 2999,
      sku: 'TSHIRT-M-BLUE',
    }, 4),
  ],
};

// Helper to generate many products for pagination testing
export const generateMockProducts = (count: number): IProduct[] => {
  return Array.from({ length: count }, (_, i) => createMockProduct({}, i));
};

export const mockProductsWithMeta = {
  data: mockProducts,
  meta: {
    page: 1,
    pageSize: 25,
    count: mockProducts.length,
    total: mockProducts.length,
    pageCount: 1,
  },
};
