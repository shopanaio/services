import { EntityStatus, FileDriver } from "@/mocks/products/types";
import type { ApiFile, FileProvider } from "@/graphql/types";
import { createMockApiTag } from "@/mocks/products/api-builders";
import type { IMediaFile } from "@/mocks/products/types";
import type {
  ICategoryDetail,
  ICategoryDetailsMockData,
  ICategoryParent,
  ICategoryChild,
  ICategoryProduct,
} from "./types";

// ============================================================================
// Helpers
// ============================================================================

const generateId = (): string => Math.random().toString(36).substring(2, 11);

const createApiFile = (name: string, index: number = 0): ApiFile => ({
  __typename: "File",
  id: generateId(),
  url: `https://picsum.photos/seed/${name}-${index}/800/800`,
  originalName: `${name}-${index}.jpg`,
  altText: null,
  ext: "jpg",
  mimeType: "image/jpeg",
  sizeBytes: 1024 * 100,
  provider: "S3" as FileProvider,
  isProcessed: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  deletedAt: null,
  deletionState: "ACTIVE",
  dimensions: { __typename: "MediaDimensions", width: 800, height: 800 },
  durationMs: null,
  externalData: null,
  meta: null,
  s3Data: null,
  sourceUrl: null,
  usage: {
    __typename: "FileUsageSummary",
    totalCount: 0,
    byEntity: [],
    fileActive: true,
  },
});

const createMediaFile = (name: string, index: number = 0): IMediaFile => ({
  id: generateId(),
  url: `https://picsum.photos/seed/${name}-${index}/400/400`,
  name: `${name}-${index}.jpg`,
  size: 1024 * 50,
  ext: "jpg",
  driver: FileDriver.S3,
  key: `categories/${name}/${index}.jpg`,
  createdAt: new Date().toISOString(),
});

// ============================================================================
// Mock Category (Audio Equipment)
// ============================================================================

export const mockCategory: ICategoryDetail = {
  id: "cat-1-4",
  title: "Audio Equipment",
  slug: "electronics/audio",
  description:
    "Browse our extensive collection of premium audio equipment. From professional-grade headphones to portable speakers, we offer top brands at competitive prices. Whether you're an audiophile or casual listener, find the perfect sound companion.",
  excerpt:
    "Premium audio equipment including headphones, speakers, and amplifiers from top brands.",
  status: EntityStatus.PUBLISHED,
  featured: createApiFile("audio-featured", 0),
  gallery: Array.from({ length: 8 }, (_, i) =>
    createApiFile("audio-gallery", i)
  ),
  seoTitle: "Audio Equipment - Shopana Store",
  seoDescription:
    "Browse our selection of premium audio equipment including headphones, speakers, and amplifiers from top brands.",
  createdAt: new Date("2025-01-15"),
  updatedAt: new Date("2025-01-25"),
};

// ============================================================================
// Mock Hierarchy
// ============================================================================

const mockAncestors: ICategoryParent[] = [
  { id: "cat-1", title: "Electronics", slug: "electronics" },
];

const mockChildren: ICategoryChild[] = [
  {
    id: "cat-1-4-1",
    title: "Headphones",
    slug: "headphones",
    status: EntityStatus.PUBLISHED,
    productCount: 45,
    featured: createMediaFile("headphones", 0),
  },
  {
    id: "cat-1-4-2",
    title: "Speakers",
    slug: "speakers",
    status: EntityStatus.PUBLISHED,
    productCount: 32,
    featured: createMediaFile("speakers", 0),
  },
  {
    id: "cat-1-4-3",
    title: "Amplifiers",
    slug: "amplifiers",
    status: EntityStatus.DRAFT,
    productCount: 18,
    featured: null,
  },
  {
    id: "cat-1-4-4",
    title: "Cables & Adapters",
    slug: "cables-adapters",
    status: EntityStatus.PUBLISHED,
    productCount: 33,
    featured: createMediaFile("cables", 0),
  },
];

// ============================================================================
// Mock Products
// ============================================================================

const mockProducts: ICategoryProduct[] = [
  {
    id: "prod-1",
    title: "Sony WH-1000XM5",
    sku: "SNY-1000",
    price: 3490000,
    featured: createMediaFile("sony-wh", 0),
    status: EntityStatus.PUBLISHED,
    inStock: true,
  },
  {
    id: "prod-2",
    title: "AirPods Pro 2nd Gen",
    sku: "APL-APRO",
    price: 2490000,
    featured: createMediaFile("airpods", 0),
    status: EntityStatus.PUBLISHED,
    inStock: true,
  },
  {
    id: "prod-3",
    title: "Bose QuietComfort 45",
    sku: "BSE-QC45",
    price: 2790000,
    featured: createMediaFile("bose-qc", 0),
    status: EntityStatus.PUBLISHED,
    inStock: true,
  },
  {
    id: "prod-4",
    title: "JBL Flip 6",
    sku: "JBL-FL6",
    price: 990000,
    featured: createMediaFile("jbl-flip", 0),
    status: EntityStatus.DRAFT,
    inStock: false,
  },
  {
    id: "prod-5",
    title: "Sennheiser HD 660S2",
    sku: "SEN-660S",
    price: 4990000,
    featured: createMediaFile("sennheiser", 0),
    status: EntityStatus.PUBLISHED,
    inStock: true,
  },
  {
    id: "prod-6",
    title: "Marshall Stanmore III",
    sku: "MRS-ST3",
    price: 3990000,
    featured: null,
    status: EntityStatus.PUBLISHED,
    inStock: true,
  },
  {
    id: "prod-7",
    title: "Beyerdynamic DT 770 PRO",
    sku: "BYR-770",
    price: 1690000,
    featured: createMediaFile("beyerdynamic", 0),
    status: EntityStatus.PUBLISHED,
    inStock: true,
  },
  {
    id: "prod-8",
    title: "Audio-Technica ATH-M50x",
    sku: "AT-M50X",
    price: 1490000,
    featured: createMediaFile("audio-technica", 0),
    status: EntityStatus.PUBLISHED,
    inStock: false,
  },
];

// ============================================================================
// Mock Tags
// ============================================================================

const mockTags = [
  createMockApiTag({ id: "tag-1", name: "Featured", handle: "featured" }),
  createMockApiTag({
    id: "tag-2",
    name: "New Arrivals",
    handle: "new-arrivals",
  }),
  createMockApiTag({
    id: "tag-3",
    name: "Holiday Sale",
    handle: "holiday-sale",
  }),
];

// ============================================================================
// Combined Mock Data
// ============================================================================

export const mockCategoryDetailsData: ICategoryDetailsMockData = {
  hierarchy: {
    ancestors: mockAncestors,
    children: mockChildren,
  },
  products: {
    items: mockProducts,
    totalCount: 128,
    hasNextPage: true,
  },
  tags: mockTags,
};
