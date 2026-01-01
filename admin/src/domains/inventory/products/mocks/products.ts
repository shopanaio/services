import {
  type IProductFormValues,
  type IProductFormVariantValues,
  EntityStatus,
  StockStatuses,
  WeightUnit,
  DimensionUnit,
} from '../types';

// Helper to create a default variant
const createVariant = (
  overrides: Partial<IProductFormVariantValues> = {}
): IProductFormVariantValues => ({
  id: `var-${Math.random().toString(36).substr(2, 9)}`,
  title: '',
  slug: '',
  status: EntityStatus.Published,
  gallery: [],
  options: [],
  sku: '',
  price: 0,
  costPrice: 0,
  oldPrice: 0,
  stockStatus: StockStatuses.IN_STOCK,
  inListing: true,
  weight: 0,
  weightUnit: WeightUnit.Gr,
  length: 0,
  width: 0,
  height: 0,
  dimensionUnit: DimensionUnit.Cm,
  variantSortIndex: 0,
  ...overrides,
});

// Mock Product 1: Simple product (1 variant)
const simpleProduct: IProductFormValues = {
  id: 'prod-001',
  title: 'iPhone 15 Pro Max',
  slug: 'iphone-15-pro-max',
  description: {
    text: 'The most powerful iPhone ever with A17 Pro chip, titanium design, and advanced camera system.',
    html: '<p>The most powerful iPhone ever with A17 Pro chip, titanium design, and advanced camera system.</p>',
    json: {},
  },
  excerpt: 'The ultimate iPhone experience',
  cover: {
    id: 'img-001',
    url: 'https://picsum.photos/seed/iphone/400/400',
    alt: 'iPhone 15 Pro Max',
  },
  gallery: [
    { id: 'img-001', url: 'https://picsum.photos/seed/iphone/400/400', alt: 'iPhone 15 Pro Max' },
    { id: 'img-002', url: 'https://picsum.photos/seed/iphone2/400/400', alt: 'iPhone 15 Pro Max Side' },
  ],
  price: 119900, // $1,199.00 in cents
  oldPrice: 129900,
  costPrice: 80000,
  sku: 'APL-IPH15PM-256',
  status: EntityStatus.Published,
  stockStatus: StockStatuses.IN_STOCK,
  categories: [
    { id: 'cat-1', title: 'Electronics' },
    { id: 'cat-2', title: 'Smartphones' },
  ],
  tags: [
    { id: 'tag-1', title: 'Apple' },
    { id: 'tag-2', title: 'Premium' },
  ],
  primaryCategoryId: 'cat-1',
  options: [],
  attributes: [
    {
      id: 'attr-1',
      title: 'Brand',
      values: [{ id: 'val-1', title: 'Apple' }],
    },
  ],
  variants: [
    createVariant({
      id: 'var-001',
      title: 'Default',
      slug: 'iphone-15-pro-max',
      sku: 'APL-IPH15PM-256',
      price: 119900,
      oldPrice: 129900,
      costPrice: 80000,
      stockStatus: StockStatuses.IN_STOCK,
      weight: 221,
      weightUnit: WeightUnit.Gr,
    }),
  ],
  requiresShipping: true,
  weight: 221,
  weightUnit: WeightUnit.Gr,
  length: 16,
  width: 8,
  height: 1,
  dimensionUnit: DimensionUnit.Cm,
  groups: [],
  seoTitle: 'iPhone 15 Pro Max - Apple',
  seoDescription: 'Buy the new iPhone 15 Pro Max with A17 Pro chip',
};

// Mock Product 2: Product with variants (Size: S/M/L)
const productWithVariants: IProductFormValues = {
  id: 'prod-002',
  title: 'Premium Cotton T-Shirt',
  slug: 'premium-cotton-t-shirt',
  description: {
    text: 'High-quality cotton t-shirt available in multiple sizes. Perfect for everyday wear.',
    html: '<p>High-quality cotton t-shirt available in multiple sizes. Perfect for everyday wear.</p>',
    json: {},
  },
  excerpt: 'Comfortable everyday cotton t-shirt',
  cover: {
    id: 'img-010',
    url: 'https://picsum.photos/seed/tshirt/400/400',
    alt: 'Premium Cotton T-Shirt',
  },
  gallery: [
    { id: 'img-010', url: 'https://picsum.photos/seed/tshirt/400/400', alt: 'T-Shirt Front' },
    { id: 'img-011', url: 'https://picsum.photos/seed/tshirt2/400/400', alt: 'T-Shirt Back' },
  ],
  price: 2999, // $29.99
  oldPrice: 0,
  costPrice: 1000,
  sku: 'TSH-COT-001',
  status: EntityStatus.Published,
  stockStatus: StockStatuses.IN_STOCK,
  categories: [
    { id: 'cat-3', title: 'Clothing' },
    { id: 'cat-4', title: 'T-Shirts' },
  ],
  tags: [
    { id: 'tag-3', title: 'Cotton' },
    { id: 'tag-4', title: 'Casual' },
  ],
  primaryCategoryId: 'cat-3',
  options: [
    {
      id: 'opt-size',
      title: 'Size',
      values: [
        { id: 'size-s', title: 'S', sortIndex: 0 },
        { id: 'size-m', title: 'M', sortIndex: 1 },
        { id: 'size-l', title: 'L', sortIndex: 2 },
      ],
    },
  ],
  attributes: [
    {
      id: 'attr-material',
      title: 'Material',
      values: [{ id: 'mat-cotton', title: '100% Cotton' }],
    },
  ],
  variants: [
    createVariant({
      id: 'var-s',
      title: 'Small',
      slug: 'premium-cotton-t-shirt-s',
      sku: 'TSH-COT-001-S',
      price: 2999,
      stockStatus: StockStatuses.IN_STOCK,
      options: [{ optionId: 'opt-size', optionTitle: 'Size', valueId: 'size-s', valueTitle: 'S' }],
      variantSortIndex: 0,
    }),
    createVariant({
      id: 'var-m',
      title: 'Medium',
      slug: 'premium-cotton-t-shirt-m',
      sku: 'TSH-COT-001-M',
      price: 2999,
      stockStatus: StockStatuses.IN_STOCK,
      options: [{ optionId: 'opt-size', optionTitle: 'Size', valueId: 'size-m', valueTitle: 'M' }],
      variantSortIndex: 1,
    }),
    createVariant({
      id: 'var-l',
      title: 'Large',
      slug: 'premium-cotton-t-shirt-l',
      sku: 'TSH-COT-001-L',
      price: 2999,
      stockStatus: StockStatuses.OUT_OF_STOCK,
      options: [{ optionId: 'opt-size', optionTitle: 'Size', valueId: 'size-l', valueTitle: 'L' }],
      variantSortIndex: 2,
    }),
  ],
  requiresShipping: true,
  weight: 200,
  weightUnit: WeightUnit.Gr,
  length: 30,
  width: 25,
  height: 2,
  dimensionUnit: DimensionUnit.Cm,
  groups: [],
  seoTitle: 'Premium Cotton T-Shirt',
  seoDescription: 'Buy comfortable cotton t-shirts in S, M, L sizes',
};

// Mock Product 3: Product with options and groups (bundle)
const productWithGroups: IProductFormValues = {
  id: 'prod-003',
  title: 'Gaming Setup Bundle',
  slug: 'gaming-setup-bundle',
  description: {
    text: 'Complete gaming setup including keyboard, mouse, and headset. Everything you need to start gaming.',
    html: '<p>Complete gaming setup including keyboard, mouse, and headset. Everything you need to start gaming.</p>',
    json: {},
  },
  excerpt: 'Complete gaming peripherals bundle',
  cover: {
    id: 'img-020',
    url: 'https://picsum.photos/seed/gaming/400/400',
    alt: 'Gaming Setup Bundle',
  },
  gallery: [
    { id: 'img-020', url: 'https://picsum.photos/seed/gaming/400/400', alt: 'Gaming Bundle' },
  ],
  price: 19999, // $199.99
  oldPrice: 24999,
  costPrice: 12000,
  sku: 'GAME-BUNDLE-001',
  status: EntityStatus.Draft,
  stockStatus: StockStatuses.PREORDER,
  categories: [
    { id: 'cat-5', title: 'Gaming' },
    { id: 'cat-6', title: 'Bundles' },
  ],
  tags: [
    { id: 'tag-5', title: 'Gaming' },
    { id: 'tag-6', title: 'Bundle' },
  ],
  primaryCategoryId: 'cat-5',
  options: [
    {
      id: 'opt-color',
      title: 'Color',
      values: [
        { id: 'color-black', title: 'Black', sortIndex: 0 },
        { id: 'color-white', title: 'White', sortIndex: 1 },
      ],
    },
  ],
  attributes: [
    {
      id: 'attr-warranty',
      title: 'Warranty',
      values: [{ id: 'warranty-2y', title: '2 Years' }],
    },
  ],
  variants: [
    createVariant({
      id: 'var-black',
      title: 'Black',
      slug: 'gaming-setup-bundle-black',
      sku: 'GAME-BUNDLE-001-BLK',
      price: 19999,
      oldPrice: 24999,
      stockStatus: StockStatuses.PREORDER,
      options: [{ optionId: 'opt-color', optionTitle: 'Color', valueId: 'color-black', valueTitle: 'Black' }],
      variantSortIndex: 0,
    }),
    createVariant({
      id: 'var-white',
      title: 'White',
      slug: 'gaming-setup-bundle-white',
      sku: 'GAME-BUNDLE-001-WHT',
      price: 19999,
      oldPrice: 24999,
      stockStatus: StockStatuses.PREORDER,
      options: [{ optionId: 'opt-color', optionTitle: 'Color', valueId: 'color-white', valueTitle: 'White' }],
      variantSortIndex: 1,
    }),
  ],
  requiresShipping: true,
  weight: 1500,
  weightUnit: WeightUnit.Gr,
  length: 50,
  width: 40,
  height: 20,
  dimensionUnit: DimensionUnit.Cm,
  groups: [
    {
      id: 'group-1',
      title: 'Included Items',
      items: [
        { id: 'item-1', productId: 'keyboard-001', quantity: 1 },
        { id: 'item-2', productId: 'mouse-001', quantity: 1 },
        { id: 'item-3', productId: 'headset-001', quantity: 1 },
      ],
    },
  ],
  seoTitle: 'Gaming Setup Bundle - Complete Gaming Kit',
  seoDescription: 'Get everything you need for gaming in one bundle',
};

// Export all mock products
export const mockProducts: IProductFormValues[] = [
  simpleProduct,
  productWithVariants,
  productWithGroups,
];

// Helper to get product by ID
export const getProductById = (id: string): IProductFormValues | undefined => {
  return mockProducts.find((p) => p.id === id);
};

// Re-export types for convenience
export type { IProductFormValues, IProductFormVariantValues };
export { EntityStatus, StockStatuses, WeightUnit, DimensionUnit };
