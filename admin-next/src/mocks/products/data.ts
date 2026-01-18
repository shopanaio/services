/**
 * Mock data for ProductInfoCardA component testing/development
 */

import {
  IProduct,
  IProductVariant,
  ICategory,
  ITag,
  IMediaFile,
  IProductFeatureGroup,
  IProductGroup,
  ISwatch,
  EntityStatus,
  WeightUnit,
  DimensionUnit,
  FeatureStyleType,
  FeatureSwatchType,
  FileDriver,
  ProductGroupPriceType,
} from './types';
import type { ApiFile, ApiDescription, FileProvider } from '@/graphql/types';

// ============================================================================
// Helper Functions
// ============================================================================

const generateId = (): string => Math.random().toString(36).substring(2, 11);

const createMediaFile = (
  name: string,
  index: number = 0,
): IMediaFile => ({
  id: generateId(),
  url: `https://picsum.photos/seed/${name}-${index}/800/800`,
  name: `${name}-${index}.jpg`,
  size: 1024 * 100,
  ext: 'jpg',
  driver: FileDriver.S3,
  key: `products/${name}/${index}.jpg`,
  createdAt: new Date().toISOString(),
});

/**
 * Create an ApiFile object for mock data
 */
const createApiFile = (
  name: string,
  index: number = 0,
): ApiFile => ({
  __typename: 'File',
  id: generateId(),
  url: `https://picsum.photos/seed/${name}-${index}/800/800`,
  originalName: `${name}-${index}.jpg`,
  altText: null,
  ext: 'jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 1024 * 100,
  provider: 'S3' as FileProvider,
  isProcessed: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  deletedAt: null,
  deletionState: 'ACTIVE',
  dimensions: { __typename: 'MediaDimensions', width: 800, height: 800 },
  durationMs: null,
  externalData: null,
  meta: null,
  s3Data: null,
  sourceUrl: null,
  usage: { __typename: 'FileUsageSummary', totalCount: 0, byEntity: [], fileActive: true },
});

/**
 * Create an ApiDescription object
 */
const createApiDescription = (
  json: Record<string, unknown>,
  text: string,
  html: string,
): ApiDescription => ({
  __typename: 'Description',
  json,
  text,
  html,
});

const createSwatch = (
  color1: string,
  color2?: string,
): ISwatch => ({
  id: generateId(),
  color1,
  color2: color2 || null,
  image: null,
  type: color2 ? FeatureSwatchType.TWO_COLOR : FeatureSwatchType.COLOR,
});

// ============================================================================
// Mock Categories
// ============================================================================

const dataMockCategories: ICategory[] = [
  {
    id: 'cat-1',
    title: 'Electronics',
    slug: 'electronics',
    description: 'Electronic devices and gadgets',
    excerpt: 'Electronic devices',
    seoTitle: 'Electronics | Shop',
    seoDescription: 'Browse our electronics collection',
    status: EntityStatus.PUBLISHED,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-01'),
    featured: createMediaFile('electronics', 0),
    gallery: [],
  },
  {
    id: 'cat-2',
    title: 'Smartphones',
    slug: 'smartphones',
    description: 'Mobile phones and accessories',
    excerpt: 'Mobile phones',
    seoTitle: 'Smartphones | Shop',
    seoDescription: 'Browse our smartphone collection',
    status: EntityStatus.PUBLISHED,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-06-02'),
    featured: createMediaFile('smartphones', 0),
    gallery: [],
  },
  {
    id: 'cat-3',
    title: 'Clothing',
    slug: 'clothing',
    description: 'Fashion and apparel',
    excerpt: 'Fashion items',
    seoTitle: 'Clothing | Shop',
    seoDescription: 'Browse our clothing collection',
    status: EntityStatus.PUBLISHED,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-06-03'),
    featured: createMediaFile('clothing', 0),
    gallery: [],
  },
];

// ============================================================================
// Mock Tags
// ============================================================================

const dataMockTags: ITag[] = [
  { id: 'tag-1', title: 'New Arrival', slug: 'new-arrival', color: '#52c41a' },
  { id: 'tag-2', title: 'Bestseller', slug: 'bestseller', color: '#1677ff' },
  { id: 'tag-3', title: 'Sale', slug: 'sale', color: '#ff4d4f' },
  { id: 'tag-4', title: 'Limited Edition', slug: 'limited-edition', color: '#722ed1' },
  { id: 'tag-5', title: 'Eco-Friendly', slug: 'eco-friendly', color: '#13c2c2' },
];

// ============================================================================
// Mock Feature Groups (Options)
// ============================================================================

const createColorOptionGroup = (): IProductFeatureGroup => ({
  id: 'opt-color',
  slug: 'color',
  title: 'Color',
  style: FeatureStyleType.COLOR,
  isOption: true,
  isActive: true,
  isEditing: false,
  features: [
    {
      id: 'feat-black',
      slug: 'black',
      title: 'Black',
      style: FeatureStyleType.COLOR,
      swatch: createSwatch('#000000'),
      group: {} as IProductFeatureGroup,
    },
    {
      id: 'feat-white',
      slug: 'white',
      title: 'White',
      style: FeatureStyleType.COLOR,
      swatch: createSwatch('#FFFFFF'),
      group: {} as IProductFeatureGroup,
    },
    {
      id: 'feat-blue',
      slug: 'blue',
      title: 'Blue',
      style: FeatureStyleType.COLOR,
      swatch: createSwatch('#1677ff'),
      group: {} as IProductFeatureGroup,
    },
  ],
});

const createSizeOptionGroup = (): IProductFeatureGroup => ({
  id: 'opt-size',
  slug: 'size',
  title: 'Size',
  style: FeatureStyleType.DEFAULT,
  isOption: true,
  isActive: true,
  isEditing: false,
  features: [
    {
      id: 'feat-s',
      slug: 's',
      title: 'S',
      style: FeatureStyleType.DEFAULT,
      swatch: null,
      group: {} as IProductFeatureGroup,
    },
    {
      id: 'feat-m',
      slug: 'm',
      title: 'M',
      style: FeatureStyleType.DEFAULT,
      swatch: null,
      group: {} as IProductFeatureGroup,
    },
    {
      id: 'feat-l',
      slug: 'l',
      title: 'L',
      style: FeatureStyleType.DEFAULT,
      swatch: null,
      group: {} as IProductFeatureGroup,
    },
    {
      id: 'feat-xl',
      slug: 'xl',
      title: 'XL',
      style: FeatureStyleType.DEFAULT,
      swatch: null,
      group: {} as IProductFeatureGroup,
    },
  ],
});

const createStorageOptionGroup = (): IProductFeatureGroup => ({
  id: 'opt-storage',
  slug: 'storage',
  title: 'Storage',
  style: FeatureStyleType.DEFAULT,
  isOption: true,
  isActive: true,
  isEditing: false,
  features: [
    {
      id: 'feat-128gb',
      slug: '128gb',
      title: '128 GB',
      style: FeatureStyleType.DEFAULT,
      swatch: null,
      group: {} as IProductFeatureGroup,
    },
    {
      id: 'feat-256gb',
      slug: '256gb',
      title: '256 GB',
      style: FeatureStyleType.DEFAULT,
      swatch: null,
      group: {} as IProductFeatureGroup,
    },
    {
      id: 'feat-512gb',
      slug: '512gb',
      title: '512 GB',
      style: FeatureStyleType.DEFAULT,
      swatch: null,
      group: {} as IProductFeatureGroup,
    },
  ],
});

// ============================================================================
// Mock Attribute Groups
// ============================================================================

const createMaterialAttributeGroup = (): IProductFeatureGroup => ({
  id: 'attr-material',
  slug: 'material',
  title: 'Material',
  style: FeatureStyleType.DEFAULT,
  isOption: false,
  isActive: true,
  isEditing: false,
  features: [
    {
      id: 'feat-cotton',
      slug: 'cotton',
      title: '100% Cotton',
      style: FeatureStyleType.DEFAULT,
      swatch: null,
      group: {} as IProductFeatureGroup,
    },
  ],
});

const createBrandAttributeGroup = (): IProductFeatureGroup => ({
  id: 'attr-brand',
  slug: 'brand',
  title: 'Brand',
  style: FeatureStyleType.DEFAULT,
  isOption: false,
  isActive: true,
  isEditing: false,
  features: [
    {
      id: 'feat-apple',
      slug: 'apple',
      title: 'Apple',
      style: FeatureStyleType.DEFAULT,
      swatch: null,
      group: {} as IProductFeatureGroup,
    },
  ],
});

// ============================================================================
// Mock Product Variants (for variable products)
// ============================================================================

const createVariant = (
  containerId: string,
  options: { color: string; storage?: string; size?: string },
  pricing: { price: number; oldPrice?: number; costPrice?: number },
  index: number,
): IProductVariant => {
  const colorGroup = createColorOptionGroup();
  const storageGroup = createStorageOptionGroup();
  const sizeGroup = createSizeOptionGroup();

  const variantOptions = [];
  if (options.color) {
    const colorFeature = colorGroup.features.find(f => f.slug === options.color);
    if (colorFeature) {
      variantOptions.push({
        ...colorFeature,
        group: colorGroup,
      });
    }
  }
  if (options.storage) {
    const storageFeature = storageGroup.features.find(f => f.slug === options.storage);
    if (storageFeature) {
      variantOptions.push({
        ...storageFeature,
        group: storageGroup,
      });
    }
  }
  if (options.size) {
    const sizeFeature = sizeGroup.features.find(f => f.slug === options.size);
    if (sizeFeature) {
      variantOptions.push({
        ...sizeFeature,
        group: sizeGroup,
      });
    }
  }

  const title = variantOptions.map(o => o.title).join(' / ');

  return {
    id: `var-${containerId}-${index}`,
    containerId,
    title,
    slug: title.toLowerCase().replace(/ \/ /g, '-').replace(/ /g, '-'),
    price: pricing.price,
    oldPrice: pricing.oldPrice || 0,
    costPrice: pricing.costPrice || Math.floor(pricing.price * 0.6),
    sku: `SKU-${containerId.toUpperCase()}-${index}`,
    featured: createMediaFile(`variant-${containerId}`, index),
    gallery: [
      createMediaFile(`variant-${containerId}`, index * 10),
      createMediaFile(`variant-${containerId}`, index * 10 + 1),
      createMediaFile(`variant-${containerId}`, index * 10 + 2),
      createMediaFile(`variant-${containerId}`, index * 10 + 3),
    ],
    weight: 150,
    weightUnit: WeightUnit.G,
    length: 150,
    width: 75,
    height: 8,
    dimensionUnit: DimensionUnit.MM,
    stockStatus: index % 3 === 0 ? 'LOW_STOCK' : index % 5 === 0 ? 'OUT_OF_STOCK' : 'IN_STOCK',
    status: EntityStatus.PUBLISHED,
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-12-15'),
    isVariant: true,
    variantSortIndex: index,
    inListing: true,
    categories: [dataMockCategories[0], dataMockCategories[1]],
    options: variantOptions,
    container: null,
  };
};

// ============================================================================
// Mock Product Groups (Bundles/Components)
// ============================================================================

const createMockProductGroup = (
  containerId: string,
  title: string,
  variants: IProductVariant[],
): IProductGroup => ({
  id: generateId(),
  title,
  isMultiple: true,
  isRequired: false,
  managedVariants: false,
  sortIndex: 0,
  items: variants.slice(0, 3).map((variant, idx) => ({
    id: generateId(),
    product: variant,
    priceType: ProductGroupPriceType.FIXED,
    priceAmountValue: 500000,
    pricePercentageValue: null,
  })),
});

// ============================================================================
// Mock EditorJS Data
// ============================================================================

const mockSimpleProductDescriptionJson = {
  time: Date.now(),
  version: "2.29.0",
  blocks: [
    {
      id: "desc-1",
      type: "paragraph",
      data: {
        text: "Premium quality cotton t-shirt with a modern fit. Perfect for everyday wear. Crafted from the finest organic cotton, this t-shirt offers exceptional comfort and durability.",
      },
    },
    {
      id: "desc-2",
      type: "header",
      data: {
        text: "Features",
        level: 3,
      },
    },
    {
      id: "desc-3",
      type: "list",
      data: {
        style: "unordered",
        items: [
          "100% organic cotton",
          "Pre-shrunk fabric",
          "Reinforced seams",
          "Machine washable",
        ],
      },
    },
    {
      id: "desc-4",
      type: "paragraph",
      data: {
        text: "Available in multiple colors and sizes. Order now and experience the comfort of premium cotton.",
      },
    },
  ],
};

const mockSimpleProductDescriptionApi = createApiDescription(
  mockSimpleProductDescriptionJson as Record<string, unknown>,
  'Premium quality cotton t-shirt with a modern fit. Perfect for everyday wear. Crafted from the finest organic cotton, this t-shirt offers exceptional comfort and durability. Features: 100% organic cotton, Pre-shrunk fabric, Reinforced seams, Machine washable. Available in multiple colors and sizes. Order now and experience the comfort of premium cotton.',
  '<p>Premium quality cotton t-shirt with a modern fit. Perfect for everyday wear. Crafted from the finest organic cotton, this t-shirt offers exceptional comfort and durability.</p><h3>Features</h3><ul><li>100% organic cotton</li><li>Pre-shrunk fabric</li><li>Reinforced seams</li><li>Machine washable</li></ul><p>Available in multiple colors and sizes. Order now and experience the comfort of premium cotton.</p>',
);

const mockVariableProductDescriptionJson = {
  time: Date.now(),
  version: "2.29.0",
  blocks: [
    {
      id: "phone-desc-1",
      type: "paragraph",
      data: {
        text: "The most advanced smartphone ever. Featuring cutting-edge technology and premium titanium design that sets new standards in mobile innovation.",
      },
    },
    {
      id: "phone-desc-2",
      type: "header",
      data: {
        text: "Key Features",
        level: 3,
      },
    },
    {
      id: "phone-desc-3",
      type: "list",
      data: {
        style: "unordered",
        items: [
          '6.7" Super Retina XDR display with ProMotion technology',
          "A17 Pro chip with 6-core GPU for unprecedented performance",
          "48MP main camera system with advanced computational photography",
          "All-day battery life with fast charging support",
          "Premium titanium design - lightest Pro model ever",
        ],
      },
    },
    {
      id: "phone-desc-5",
      type: "paragraph",
      data: {
        text: "Available in Natural, Blue, White, and Black titanium finishes. Choose your storage capacity and get ready for the future of mobile technology.",
      },
    },
  ],
};

const mockVariableProductDescriptionApi = createApiDescription(
  mockVariableProductDescriptionJson as Record<string, unknown>,
  'The most advanced smartphone ever. Featuring cutting-edge technology and premium titanium design that sets new standards in mobile innovation. Key Features: 6.7" Super Retina XDR display with ProMotion technology, A17 Pro chip with 6-core GPU for unprecedented performance, 48MP main camera system with advanced computational photography, All-day battery life with fast charging support, Premium titanium design - lightest Pro model ever. Available in Natural, Blue, White, and Black titanium finishes.',
  '<p>The most advanced smartphone ever. Featuring cutting-edge technology and premium titanium design that sets new standards in mobile innovation.</p><h3>Key Features</h3><ul><li>6.7" Super Retina XDR display with ProMotion technology</li><li>A17 Pro chip with 6-core GPU for unprecedented performance</li><li>48MP main camera system with advanced computational photography</li><li>All-day battery life with fast charging support</li><li>Premium titanium design - lightest Pro model ever</li></ul><p>Available in Natural, Blue, White, and Black titanium finishes. Choose your storage capacity and get ready for the future of mobile technology.</p>',
);

// ============================================================================
// Mock Products
// ============================================================================

/**
 * Simple product without variants
 */
export const mockSimpleProduct: IProduct = {
  id: 'prod-simple-1',
  title: 'Classic Cotton T-Shirt',
  description: mockSimpleProductDescriptionApi,
  excerpt: 'Premium quality cotton t-shirt with a modern fit. Perfect for everyday wear.',
  slug: 'classic-cotton-t-shirt',
  status: EntityStatus.PUBLISHED,
  price: 299900, // 2999.00 RUB in kopecks
  oldPrice: 399900,
  costPrice: 150000,
  sku: 'TSHIRT-001',
  featured: createApiFile('tshirt', 0),
  gallery: [
    createApiFile('tshirt', 1),
    createApiFile('tshirt', 2),
    createApiFile('tshirt', 3),
    createApiFile('tshirt', 4),
  ],
  weight: 200,
  weightUnit: WeightUnit.G,
  length: 70,
  width: 50,
  height: 2,
  dimensionUnit: DimensionUnit.CM,
  stockStatus: 'IN_STOCK',
  requiresShipping: true,
  seoTitle: 'Classic Cotton T-Shirt | Premium Quality',
  seoDescription: 'Shop our premium quality classic cotton t-shirt. 100% organic cotton, modern fit, perfect for everyday wear.',
  createdAt: new Date('2024-03-15'),
  updatedAt: new Date('2024-12-20'),
  isVariant: false,
  isVariableProduct: false,
  variantId: 'var-simple-1',
  variants: [],
  embedVariant: null,
  categories: [dataMockCategories[2]],
  primaryCategory: { id: dataMockCategories[2].id, title: dataMockCategories[2].title },
  tags: [dataMockTags[0], dataMockTags[4]],
  attributes: [createMaterialAttributeGroup()],
  options: [],
  groups: [],
  container: null,
  containerId: 'prod-simple-1',
};

/**
 * Variable product with multiple variants (smartphone)
 */
export const mockVariableProduct: IProduct = (() => {
  const containerId = 'prod-phone-1';
  const colorGroup = createColorOptionGroup();
  const storageGroup = createStorageOptionGroup();

  const variants: IProductVariant[] = [
    createVariant(containerId, { color: 'black', storage: '128gb' }, { price: 8999900, oldPrice: 9999900 }, 0),
    createVariant(containerId, { color: 'black', storage: '256gb' }, { price: 9999900, oldPrice: 10999900 }, 1),
    createVariant(containerId, { color: 'black', storage: '512gb' }, { price: 11999900 }, 2),
    createVariant(containerId, { color: 'white', storage: '128gb' }, { price: 8999900, oldPrice: 9999900 }, 3),
    createVariant(containerId, { color: 'white', storage: '256gb' }, { price: 9999900, oldPrice: 10999900 }, 4),
    createVariant(containerId, { color: 'white', storage: '512gb' }, { price: 11999900 }, 5),
    createVariant(containerId, { color: 'blue', storage: '128gb' }, { price: 9199900, oldPrice: 10199900 }, 6),
    createVariant(containerId, { color: 'blue', storage: '256gb' }, { price: 10199900, oldPrice: 11199900 }, 7),
    createVariant(containerId, { color: 'blue', storage: '512gb' }, { price: 12199900 }, 8),
  ];

  return {
    id: containerId,
    title: 'Smartphone Pro Max 15',
    description: mockVariableProductDescriptionApi,
    excerpt: 'The most advanced smartphone ever with cutting-edge A17 Pro chip, 48MP camera system, and premium titanium design.',
    slug: 'smartphone-pro-max-15',
    status: EntityStatus.PUBLISHED,
    price: variants[0].price,
    oldPrice: variants[0].oldPrice,
    costPrice: Math.floor(variants[0].price * 0.65),
    sku: null,
    featured: createApiFile('phone', 0),
    gallery: [
      createApiFile('phone', 1),
      createApiFile('phone', 2),
      createApiFile('phone', 3),
      createApiFile('phone', 4),
      createApiFile('phone', 5),
      createApiFile('phone', 6),
      createApiFile('phone', 7),
    ],
    weight: 221,
    weightUnit: WeightUnit.G,
    length: 159,
    width: 76,
    height: 8,
    dimensionUnit: DimensionUnit.MM,
    stockStatus: 'IN_STOCK',
    requiresShipping: true,
    seoTitle: 'Smartphone Pro Max 15 | Buy Now',
    seoDescription: 'Shop Smartphone Pro Max 15. Available in multiple colors and storage options.',
    createdAt: new Date('2024-09-12'),
    updatedAt: new Date('2024-12-28'),
    isVariant: false,
    isVariableProduct: true,
    variantId: null,
    variants,
    embedVariant: null,
    categories: [dataMockCategories[0], dataMockCategories[1]],
    primaryCategory: { id: dataMockCategories[1].id, title: dataMockCategories[1].title },
    tags: [dataMockTags[0], dataMockTags[1], dataMockTags[3]],
    attributes: [createBrandAttributeGroup()],
    options: [colorGroup, storageGroup],
    groups: [createMockProductGroup(containerId, 'Accessories', variants)],
    container: null,
    containerId,
  };
})();

/**
 * Draft product (not yet published)
 */
export const mockDraftProduct: IProduct = {
  ...mockSimpleProduct,
  id: 'prod-draft-1',
  title: 'New Product Draft',
  slug: 'new-product-draft',
  status: EntityStatus.DRAFT,
  description: null,
  excerpt: null,
  seoTitle: null,
  seoDescription: null,
  featured: null,
  gallery: [],
  tags: [],
  containerId: 'prod-draft-1',
  variantId: 'var-draft-1',
};

/**
 * Archived product
 */
export const mockArchivedProduct: IProduct = {
  ...mockSimpleProduct,
  id: 'prod-archived-1',
  title: 'Discontinued Product',
  slug: 'discontinued-product',
  status: EntityStatus.ARCHIVED,
  stockStatus: 'OUT_OF_STOCK',
  containerId: 'prod-archived-1',
  variantId: 'var-archived-1',
};

// ============================================================================
// Export Default Product for Quick Testing
// ============================================================================

export const mockProduct = mockVariableProduct;
