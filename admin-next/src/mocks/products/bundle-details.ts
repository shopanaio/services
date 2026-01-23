/**
 * Mock data for Bundle detail modal
 */

import type { IProduct } from "./types";
import type { ITag } from "@/domains/inventory/products/modals";
import type { IAttributeRow } from "@/domains/inventory/products/modals/edit-attributes-modal/types";
import { ComponentItemType, ComponentPriceType } from "@/domains/inventory/products/modals/edit-components-modal/types";
import type { IComponentGroup } from "@/domains/inventory/products/modals/edit-components-modal/types";
import { EntityStatus, WeightUnit, DimensionUnit, type ICategory, type ITag as IProductTag } from "./types";
import { mockCategories } from "./categories";
import { mockTags } from "./tags";
import { createMockData as createAttributesMockData } from "./attributes";
import type { ApiFile, ApiDescription, FileProvider } from "@/graphql/types";

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

const createApiDescription = (
  json: Record<string, unknown>,
  text: string,
  html: string,
): ApiDescription => ({
  __typename: "Description",
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

const bundleDescriptionApi = createApiDescription(
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
  categories: [mockCategories[0]],
  primaryCategory: {
    id: mockCategories[0].id,
    title: mockCategories[0].title,
  },
  tags: [mockTags[0], mockTags[1]] as unknown as IProductTag[],
  attributes: [],
  options: [],
  groups: [],
  container: null,
  containerId: "bnd-detail-1",
};

const mockBundleComponentGroups: IComponentGroup[] = [
  {
    id: "bnd-grp-1",
    title: "Camera Body",
    sortIndex: 0,
    isRequired: true,
    isMultiple: false,
    minSelection: 1,
    maxSelection: 1,
    items: [
      {
        id: "bnd-item-1",
        itemType: ComponentItemType.PRODUCT,
        assignedProduct: {
          __typename: "Product",
          id: "prod-cam-body",
          title: "DSLR Camera Body 24.2MP",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isPublished: true,
          options: [],
          features: [],
          variants: { __typename: "VariantConnection", edges: [], pageInfo: { __typename: "PageInfo", hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }, totalCount: 0 },
          variantsCount: 0,
        },
        sortIndex: 0,
        pricingRule: {
          priceType: ComponentPriceType.INCLUDED,
          priceValue: null,
        },
        title: null,
        featuredImage: null,
      },
    ],
  },
  {
    id: "bnd-grp-2",
    title: "Lenses",
    sortIndex: 1,
    isRequired: true,
    isMultiple: true,
    minSelection: 1,
    maxSelection: 3,
    items: [
      {
        id: "bnd-item-2",
        itemType: ComponentItemType.PRODUCT,
        assignedProduct: {
          __typename: "Product",
          id: "prod-lens-18-55",
          title: "18-55mm Kit Lens",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isPublished: true,
          options: [],
          features: [],
          variants: { __typename: "VariantConnection", edges: [], pageInfo: { __typename: "PageInfo", hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }, totalCount: 0 },
          variantsCount: 0,
        },
        sortIndex: 0,
        pricingRule: {
          priceType: ComponentPriceType.INCLUDED,
          priceValue: null,
        },
        title: null,
        featuredImage: null,
      },
      {
        id: "bnd-item-3",
        itemType: ComponentItemType.PRODUCT,
        assignedProduct: {
          __typename: "Product",
          id: "prod-lens-55-200",
          title: "55-200mm Telephoto Lens",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isPublished: true,
          options: [],
          features: [],
          variants: { __typename: "VariantConnection", edges: [], pageInfo: { __typename: "PageInfo", hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }, totalCount: 0 },
          variantsCount: 0,
        },
        sortIndex: 1,
        pricingRule: {
          priceType: ComponentPriceType.INCLUDED,
          priceValue: null,
        },
        title: null,
        featuredImage: null,
      },
    ],
  },
  {
    id: "bnd-grp-3",
    title: "Accessories",
    sortIndex: 2,
    isRequired: false,
    isMultiple: true,
    minSelection: 0,
    maxSelection: 5,
    items: [
      {
        id: "bnd-item-4",
        itemType: ComponentItemType.PRODUCT,
        assignedProduct: {
          __typename: "Product",
          id: "prod-bag",
          title: "Camera Bag",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isPublished: true,
          options: [],
          features: [],
          variants: { __typename: "VariantConnection", edges: [], pageInfo: { __typename: "PageInfo", hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }, totalCount: 0 },
          variantsCount: 0,
        },
        sortIndex: 0,
        pricingRule: {
          priceType: ComponentPriceType.DISCOUNT_PERCENT,
          priceValue: 20,
        },
        title: null,
        featuredImage: null,
      },
      {
        id: "bnd-item-5",
        itemType: ComponentItemType.PRODUCT,
        assignedProduct: {
          __typename: "Product",
          id: "prod-sd-card",
          title: "32GB SD Card",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isPublished: true,
          options: [],
          features: [],
          variants: { __typename: "VariantConnection", edges: [], pageInfo: { __typename: "PageInfo", hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }, totalCount: 0 },
          variantsCount: 0,
        },
        sortIndex: 1,
        pricingRule: {
          priceType: ComponentPriceType.FREE,
          priceValue: null,
        },
        title: null,
        featuredImage: null,
      },
      {
        id: "bnd-item-6",
        itemType: ComponentItemType.PRODUCT,
        assignedProduct: {
          __typename: "Product",
          id: "prod-cleaning",
          title: "Cleaning Kit",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isPublished: true,
          options: [],
          features: [],
          variants: { __typename: "VariantConnection", edges: [], pageInfo: { __typename: "PageInfo", hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }, totalCount: 0 },
          variantsCount: 0,
        },
        sortIndex: 2,
        pricingRule: {
          priceType: ComponentPriceType.FREE,
          priceValue: null,
        },
        title: null,
        featuredImage: null,
      },
    ],
  },
];

export interface IBundleDetailsMockData {
  categories: {
    primary: ICategory | null;
    list: ICategory[];
  };
  tags: ITag[];
  attributes: IAttributeRow[];
  components: IComponentGroup[];
}

export const bundleDetailsMockData: IBundleDetailsMockData = {
  categories: {
    primary: mockCategories[0],
    list: mockCategories.slice(1, 3),
  },
  tags: mockTags.slice(0, 3) as ITag[],
  attributes: createAttributesMockData(),
  components: mockBundleComponentGroups,
};
