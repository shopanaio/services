// Mock data for admin panel based on GraphQL schema

const now = new Date().toISOString();

// User type
export const mockUsers = [
  {
    __typename: 'User',
    id: '1',
    tenantId: 'tenant-1',
    email: 'admin@shopana.io',
    firstName: 'Admin',
    lastName: 'User',
    isReady: true,
    isVerified: true,
    phoneNumber: '+1234567890',
    language: 'en',
    timezone: 'UTC',
    createdAt: now,
    updatedAt: now,
  },
  {
    __typename: 'User',
    id: '2',
    tenantId: 'tenant-1',
    email: 'test@shopana.io',
    firstName: 'Test',
    lastName: 'User',
    isReady: true,
    isVerified: true,
    phoneNumber: null,
    language: 'en',
    timezone: 'UTC',
    createdAt: now,
    updatedAt: now,
  },
];

// Project type
export const mockProjects = [
  {
    id: 'proj-1',
    name: 'Demo Store',
    slug: 'demo-store',
    status: 'ACTIVE',
  },
  {
    id: 'proj-2',
    name: 'Test Shop',
    slug: 'test-shop',
    status: 'ACTIVE',
  },
];

// ProjectInfo type
export const mockProjectInfo = {
  name: 'Demo Store',
  timezone: 'America/New_York',
  country: 'US',
  phoneNumber: '+1234567890',
  email: 'demo@shopana.io',
  currency: 'USD',
  locale: 'en-US',
};

// Locale type
export const mockLocales = [
  { title: 'English', code: 'en', isActive: true },
  { title: 'Russian', code: 'ru', isActive: true },
  { title: 'Spanish', code: 'es', isActive: false },
];

// Currency type
export const mockCurrencies = [
  {
    title: 'US Dollar',
    code: 'USD',
    isActive: true,
    decimalPlaces: 2,
    exchangeRate: 1.0,
    symbolLeft: '$',
    symbolRight: '',
    decimalSeparator: '.',
    thousandsSeparator: ',',
  },
  {
    title: 'Euro',
    code: 'EUR',
    isActive: true,
    decimalPlaces: 2,
    exchangeRate: 0.85,
    symbolLeft: '',
    symbolRight: '€',
    decimalSeparator: ',',
    thousandsSeparator: ' ',
  },
  {
    title: 'Russian Ruble',
    code: 'RUB',
    isActive: true,
    decimalPlaces: 2,
    exchangeRate: 90.0,
    symbolLeft: '',
    symbolRight: '₽',
    decimalSeparator: ',',
    thousandsSeparator: ' ',
  },
];

// ApiKey type
export const mockApiKeys = [
  {
    id: 'key-1',
    name: 'Production API Key',
    createdAt: now,
    createdBy: mockUsers[0],
    dueDate: null,
    lastUsedAt: now,
    isBanned: false,
  },
];

// File type
const mockFile = (id: string, name: string) => ({
  __typename: 'File',
  id,
  driver: 'S3',
  name,
  url: `https://picsum.photos/seed/${id}/400/400`,
  size: 1024,
  ext: 'jpg',
  key: `files/${id}.jpg`,
  createdAt: now,
  updatedAt: now,
});

// Category type
export const mockCategories = [
  {
    __typename: 'Category',
    id: 'cat-1',
    slug: 'electronics',
    title: 'Electronics',
    status: 'ACTIVE',
    description: 'Electronic devices and gadgets',
    excerpt: 'Electronics',
    cover: mockFile('cat-1-cover', 'electronics.jpg'),
    gallery: [],
    children: [],
    parent: null,
    createdAt: now,
    updatedAt: now,
    includeChildrenProducts: true,
    listingFilters: [],
    labels: [],
    tags: [],
    listingOrderBy: 'CREATED_AT_DESC',
    listingOrderByStatus: true,
    listingPlacement: 0,
    listingType: 'GRID',
    seoTitle: 'Electronics',
    seoDescription: 'Shop electronics',
  },
  {
    __typename: 'Category',
    id: 'cat-2',
    slug: 'clothing',
    title: 'Clothing',
    status: 'ACTIVE',
    description: 'Fashion and apparel',
    excerpt: 'Clothing',
    cover: mockFile('cat-2-cover', 'clothing.jpg'),
    gallery: [],
    children: [],
    parent: null,
    createdAt: now,
    updatedAt: now,
    includeChildrenProducts: true,
    listingFilters: [],
    labels: [],
    tags: [],
    listingOrderBy: 'CREATED_AT_DESC',
    listingOrderByStatus: true,
    listingPlacement: 1,
    listingType: 'GRID',
    seoTitle: 'Clothing',
    seoDescription: 'Shop clothing',
  },
  {
    __typename: 'Category',
    id: 'cat-3',
    slug: 'phones',
    title: 'Phones',
    status: 'ACTIVE',
    description: 'Smartphones and accessories',
    excerpt: 'Phones',
    cover: mockFile('cat-3-cover', 'phones.jpg'),
    gallery: [],
    children: [],
    parent: { __typename: 'Category', id: 'cat-1', slug: 'electronics', title: 'Electronics' },
    createdAt: now,
    updatedAt: now,
    includeChildrenProducts: true,
    listingFilters: [],
    labels: [],
    tags: [],
    listingOrderBy: 'CREATED_AT_DESC',
    listingOrderByStatus: true,
    listingPlacement: 0,
    listingType: 'GRID',
    seoTitle: 'Phones',
    seoDescription: 'Shop phones',
  },
];

// Variant type
const createVariant = (
  id: string,
  productId: string,
  productTitle: string,
  title: string,
  price: number,
  sku: string,
  categories: typeof mockCategories = []
) => ({
  __typename: 'Variant',
  id,
  containerId: productId,
  containerTitle: productTitle,
  title,
  slug: title.toLowerCase().replace(/\s+/g, '-'),
  price,
  oldPrice: Math.round(price * 1.2),
  costPrice: Math.round(price * 0.6),
  sku,
  barcode: `BAR${id}`,
  stockStatus: 'IN_STOCK',
  cover: mockFile(`var-${id}`, `${title}.jpg`),
  gallery: [mockFile(`var-${id}-1`, `${title}-1.jpg`), mockFile(`var-${id}-2`, `${title}-2.jpg`)],
  categories,
  features: [],
  featuresV2: [],
  inListing: true,
  listingSortIndex: '0',
  variantSortIndex: 0,
  weight: 0.5,
  weightUnit: 'KG',
  width: 10,
  length: 15,
  height: 5,
  dimensionUnit: 'CM',
  createdAt: now,
  updatedAt: now,
});

// Product type
export const mockProducts = [
  {
    __typename: 'Product',
    id: 'prod-1',
    slug: 'iphone-15-pro',
    title: 'iPhone 15 Pro',
    description: 'The latest iPhone with A17 Pro chip',
    excerpt: 'Latest iPhone',
    status: 'ACTIVE',
    requiresShipping: true,
    seoTitle: 'iPhone 15 Pro',
    seoDescription: 'Buy iPhone 15 Pro',
    groups: [],
    labels: [],
    tags: [],
    primaryCategory: mockCategories[2],
    featuresV2: [],
    optionsV2: [],
    variants: [
      createVariant('var-1', 'prod-1', 'iPhone 15 Pro', 'iPhone 15 Pro 128GB Black', 99900, 'IPH15-128-BLK', [mockCategories[2]]),
      createVariant('var-2', 'prod-1', 'iPhone 15 Pro', 'iPhone 15 Pro 256GB Black', 109900, 'IPH15-256-BLK', [mockCategories[2]]),
      createVariant('var-3', 'prod-1', 'iPhone 15 Pro', 'iPhone 15 Pro 128GB White', 99900, 'IPH15-128-WHT', [mockCategories[2]]),
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    __typename: 'Product',
    id: 'prod-2',
    slug: 'samsung-galaxy-s24',
    title: 'Samsung Galaxy S24',
    description: 'Samsung flagship smartphone',
    excerpt: 'Samsung flagship',
    status: 'ACTIVE',
    requiresShipping: true,
    seoTitle: 'Samsung Galaxy S24',
    seoDescription: 'Buy Samsung Galaxy S24',
    groups: [],
    labels: [],
    tags: [],
    primaryCategory: mockCategories[2],
    featuresV2: [],
    optionsV2: [],
    variants: [
      createVariant('var-4', 'prod-2', 'Samsung Galaxy S24', 'Galaxy S24 128GB Black', 79900, 'SAM-S24-128-BLK', [mockCategories[2]]),
      createVariant('var-5', 'prod-2', 'Samsung Galaxy S24', 'Galaxy S24 256GB Black', 89900, 'SAM-S24-256-BLK', [mockCategories[2]]),
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    __typename: 'Product',
    id: 'prod-3',
    slug: 'cotton-t-shirt',
    title: 'Cotton T-Shirt',
    description: 'Comfortable cotton t-shirt',
    excerpt: 'Cotton t-shirt',
    status: 'ACTIVE',
    requiresShipping: true,
    seoTitle: 'Cotton T-Shirt',
    seoDescription: 'Buy Cotton T-Shirt',
    groups: [],
    labels: [],
    tags: [],
    primaryCategory: mockCategories[1],
    featuresV2: [],
    optionsV2: [],
    variants: [
      createVariant('var-6', 'prod-3', 'Cotton T-Shirt', 'T-Shirt Size S White', 2900, 'TSH-S-WHT', [mockCategories[1]]),
      createVariant('var-7', 'prod-3', 'Cotton T-Shirt', 'T-Shirt Size M White', 2900, 'TSH-M-WHT', [mockCategories[1]]),
      createVariant('var-8', 'prod-3', 'Cotton T-Shirt', 'T-Shirt Size L White', 2900, 'TSH-L-WHT', [mockCategories[1]]),
      createVariant('var-9', 'prod-3', 'Cotton T-Shirt', 'T-Shirt Size S Black', 2900, 'TSH-S-BLK', [mockCategories[1]]),
      createVariant('var-10', 'prod-3', 'Cotton T-Shirt', 'T-Shirt Size M Black', 2900, 'TSH-M-BLK', [mockCategories[1]]),
    ],
    createdAt: now,
    updatedAt: now,
  },
];

// All variants flat list
export const mockVariants = mockProducts.flatMap((p) => p.variants);

// Current logged in user
export const currentUser = mockUsers[0];
