/**
 * Mock data for Bundle detail modal
 */

import type { IProduct } from "./types";
import type { IAttributeRow } from "./attributes";
import type {
  IBundleConfiguration,
  IBundleGroup,
  PricingRuleTemplate,
} from "@/domains/inventory/bundles/types";
import type { IReviewsData } from "@/domains/inventory/products/components/product-details-card/types";
import { EntityStatus, WeightUnit, DimensionUnit, type ITag as IProductTag } from "./types";
import { mockCategories } from "./categories";
import { mockTags } from "./tags";
import { createMockData as createAttributesMockData } from "./attributes";
import { productDetailsMockData } from "./product-details";
import { BundleType, type ApiCategory, type ApiFile, type ApiRichText, type ApiTag, type FileProvider } from "@/graphql/types";

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

const createApiRichText = (
  json: Record<string, unknown>,
  text: string,
  html: string,
): ApiRichText => ({
  __typename: "RichText",
  json,
  text,
  html,
});

const bundleDescriptionJson = {
  time: Date.now(),
  version: "2.29.0",
  blocks: [
    {
      id: "bnd-desc-1",
      type: "paragraph",
      data: {
        text: "Everything you need to start your photography journey. This bundle includes a professional-grade camera body, two versatile lenses, and essential accessories — all at a special bundle price.",
      },
    },
    {
      id: "bnd-desc-2",
      type: "header",
      data: {
        text: "What's Included",
        level: 3,
      },
    },
    {
      id: "bnd-desc-3",
      type: "list",
      data: {
        style: "unordered",
        items: [
          "Camera Body with 24.2MP sensor",
          "18-55mm Kit Lens",
          "55-200mm Telephoto Lens",
          "Camera bag with padded dividers",
          "32GB SD card",
          "Cleaning kit",
        ],
      },
    },
    {
      id: "bnd-desc-4",
      type: "paragraph",
      data: {
        text: "Save 25% compared to buying items individually. Perfect gift for aspiring photographers.",
      },
    },
  ],
};

const bundleDescriptionApi = createApiRichText(
  bundleDescriptionJson as Record<string, unknown>,
  "Everything you need to start your photography journey. This bundle includes a professional-grade camera body, two versatile lenses, and essential accessories. What's Included: Camera Body with 24.2MP sensor, 18-55mm Kit Lens, 55-200mm Telephoto Lens, Camera bag, 32GB SD card, Cleaning kit. Save 25% compared to buying items individually.",
  '<p>Everything you need to start your photography journey. This bundle includes a professional-grade camera body, two versatile lenses, and essential accessories — all at a special bundle price.</p><h3>What\'s Included</h3><ul><li>Camera Body with 24.2MP sensor</li><li>18-55mm Kit Lens</li><li>55-200mm Telephoto Lens</li><li>Camera bag with padded dividers</li><li>32GB SD card</li><li>Cleaning kit</li></ul><p>Save 25% compared to buying items individually. Perfect gift for aspiring photographers.</p>',
);

export const mockBundleProduct: IProduct = {
  id: "bnd-detail-1",
  title: "Camera Starter Kit",
  description: bundleDescriptionApi,
  excerpt:
    "Complete photography starter kit with camera body, two lenses, and essential accessories. Save 25% vs individual purchase.",
  slug: "camera-starter-kit",
  status: EntityStatus.PUBLISHED,
  price: 5999900,
  oldPrice: 7999900,
  costPrice: 3500000,
  sku: "BND-CAM-001",
  featured: createApiFile("camera-kit", 0),
  gallery: [
    createApiFile("camera-kit", 1),
    createApiFile("camera-kit", 2),
    createApiFile("camera-kit", 3),
    createApiFile("camera-kit", 4),
    createApiFile("camera-kit", 5),
  ],
  weight: 1200,
  weightUnit: WeightUnit.G,
  length: 30,
  width: 25,
  height: 20,
  dimensionUnit: DimensionUnit.CM,
  stockStatus: "IN_STOCK",
  requiresShipping: true,
  seoTitle: "Camera Starter Kit | Complete Photography Bundle",
  seoDescription:
    "Get everything you need to start photography. Professional camera body, two lenses, bag, and accessories at 25% off.",
  createdAt: new Date("2024-11-15"),
  updatedAt: new Date("2024-12-20"),
  isVariant: false,
  isVariableProduct: false,
  variantId: null,
  variants: [],
  embedVariant: null,
  categories: [mockCategories[0] as unknown as IProduct["categories"][number]],
  primaryCategory: {
    id: mockCategories[0].id,
    title: mockCategories[0].name,
  },
  tags: [mockTags[0], mockTags[1]] as unknown as IProductTag[],
  attributes: [],
  options: [],
  groups: [],
  container: null,
  containerId: "bnd-detail-1",
};

export interface IBundleDetailsMockData {
  bundleType: BundleType | null;
  categories: {
    primary: ApiCategory | null;
    list: ApiCategory[];
  };
  tags: ApiTag[];
  attributes: IAttributeRow[];
  reviews: IReviewsData;
  configurations: IBundleConfiguration[];
  pricingTemplates: PricingRuleTemplate[];
}

export const bundleDetailsMockData: IBundleDetailsMockData = {
  bundleType: BundleType.MixAndMatch,
  categories: {
    primary: mockCategories[0],
    list: mockCategories.slice(1, 3),
  },
  tags: mockTags.slice(0, 3).map((tag) => ({
    __typename: "Tag",
    id: tag.id,
    name: tag.title,
    handle: tag.slug,
    productsCount: 0,
    products: {
      __typename: "ProductConnection",
      edges: [],
      pageInfo: {
        __typename: "PageInfo",
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      },
      totalCount: 0,
    },
    createdAt: new Date().toISOString(),
  })),
  attributes: createAttributesMockData(),
  reviews: {
    rating: 4.5,
    reviewsCount: 47,
    breakdown: [
      { stars: 5, count: 28, percent: 60 },
      { stars: 4, count: 12, percent: 25 },
      { stars: 3, count: 5, percent: 11 },
      { stars: 2, count: 1, percent: 2 },
      { stars: 1, count: 1, percent: 2 },
    ],
  },
  configurations: [
    {
      id: "bundle-config-1",
      title: "Configuration 1",
      bundleItems: productDetailsMockData.bundleItems,
      dependencyRules: productDetailsMockData.dependencyRules,
    },
    {
      id: "bundle-config-2",
      title: "Configuration 2",
      bundleItems: productDetailsMockData.bundleItems,
      dependencyRules: productDetailsMockData.dependencyRules,
    },
    {
      id: "bundle-config-3",
      title: "Configuration 3",
      bundleItems: productDetailsMockData.bundleItems,
      dependencyRules: productDetailsMockData.dependencyRules,
    },
  ],
  pricingTemplates: productDetailsMockData.pricingTemplates,
};
