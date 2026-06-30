/**
 * Mock data for Bundles list page in generated API shape.
 */

import {
  BundleDisplayStyle,
  BundleType,
  ProductKind,
  type ApiBundle,
  type ApiFile,
  type ApiPageInfo,
  type ApiProductMediaItem,
} from "@/graphql/types";
import { createMockApiFile } from "./api-builders";

const pageInfo: ApiPageInfo = {
  __typename: "PageInfo",
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
};

const createBundleMedia = (seed: string): ApiProductMediaItem[] => [
  {
    __typename: "ProductMediaItem",
    file: createMockApiFile({
      id: `file-${seed}`,
      name: `${seed}.jpg`,
      seed,
      width: 200,
      height: 200,
    }) as ApiFile,
    sortIndex: 0,
  },
];

const createMockBundle = (params: {
  id: string;
  title: string;
  imageSeed: string;
  isPublished: boolean;
  type: BundleType | null;
  createdAt: string;
}): ApiBundle => ({
  __typename: "Bundle",
  id: params.id,
  title: params.title,
  handle: params.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  kind: ProductKind.Bundle,
  isPublished: params.isPublished,
  type: params.type,
  createdAt: params.createdAt,
  updatedAt: params.createdAt,
  publishedAt: params.isPublished ? params.createdAt : null,
  deletedAt: null,
  description: null,
  excerpt: null,
  displayStyle: BundleDisplayStyle.Flat,
  media: createBundleMedia(params.imageSeed),
  categoryAssignments: [],
  configurations: [],
  features: [],
  options: [],
  primaryCategory: null,
  revision: 1,
  seo: null,
  tags: [],
  variants: {
    __typename: "VariantConnection",
    edges: [],
    pageInfo,
    totalCount: 0,
  },
  variantsCount: 0,
  vendor: null,
});

export const mockBundles: ApiBundle[] = [
  createMockBundle({
    id: "bnd-1",
    title: "Camera Starter Kit",
    imageSeed: "camera-kit",
    isPublished: true,
    type: BundleType.Fixed,
    createdAt: "2024-11-15T10:00:00Z",
  }),
  createMockBundle({
    id: "bnd-2",
    title: "Home Office Essentials",
    imageSeed: "office-kit",
    isPublished: true,
    type: BundleType.Fixed,
    createdAt: "2024-11-20T08:30:00Z",
  }),
  createMockBundle({
    id: "bnd-3",
    title: "Gaming Setup Bundle",
    imageSeed: "gaming-kit",
    isPublished: true,
    type: BundleType.Fixed,
    createdAt: "2024-10-05T12:00:00Z",
  }),
  createMockBundle({
    id: "bnd-4",
    title: "Fitness Tracker Kit",
    imageSeed: "fitness-kit",
    isPublished: false,
    type: BundleType.Fixed,
    createdAt: "2024-12-10T16:00:00Z",
  }),
  createMockBundle({
    id: "bnd-5",
    title: "Kitchen Appliance Set",
    imageSeed: "kitchen-kit",
    isPublished: true,
    type: BundleType.Fixed,
    createdAt: "2024-09-28T09:15:00Z",
  }),
  createMockBundle({
    id: "bnd-6",
    title: "Travel Essentials Pack",
    imageSeed: "travel-kit",
    isPublished: true,
    type: BundleType.Fixed,
    createdAt: "2024-11-01T14:30:00Z",
  }),
  createMockBundle({
    id: "bnd-7",
    title: "Baby Care Starter Kit",
    imageSeed: "baby-kit",
    isPublished: false,
    type: BundleType.Fixed,
    createdAt: "2024-12-15T11:00:00Z",
  }),
  createMockBundle({
    id: "bnd-8",
    title: "6-Pack Craft Beer",
    imageSeed: "beer-pack",
    isPublished: true,
    type: BundleType.Multipack,
    createdAt: "2024-12-01T09:00:00Z",
  }),
  createMockBundle({
    id: "bnd-9",
    title: "12-Pack Energy Drinks",
    imageSeed: "energy-pack",
    isPublished: true,
    type: BundleType.Multipack,
    createdAt: "2024-11-10T07:45:00Z",
  }),
  createMockBundle({
    id: "bnd-10",
    title: "3-Pack T-Shirts",
    imageSeed: "tshirt-pack",
    isPublished: true,
    type: BundleType.Multipack,
    createdAt: "2024-10-15T13:00:00Z",
  }),
  createMockBundle({
    id: "bnd-11",
    title: "5-Pack Socks",
    imageSeed: "socks-pack",
    isPublished: false,
    type: BundleType.Multipack,
    createdAt: "2024-12-05T10:30:00Z",
  }),
  createMockBundle({
    id: "bnd-12",
    title: "4-Pack Protein Bars",
    imageSeed: "protein-pack",
    isPublished: true,
    type: BundleType.Multipack,
    createdAt: "2024-11-25T08:00:00Z",
  }),
  createMockBundle({
    id: "bnd-13",
    title: "10-Pack Face Masks",
    imageSeed: "masks-pack",
    isPublished: true,
    type: BundleType.Multipack,
    createdAt: "2024-10-30T15:00:00Z",
  }),
  createMockBundle({
    id: "bnd-14",
    title: "Build Your Chocolate Box",
    imageSeed: "choco-box",
    isPublished: true,
    type: BundleType.MixAndMatch,
    createdAt: "2024-10-20T14:00:00Z",
  }),
  createMockBundle({
    id: "bnd-15",
    title: "Custom Gift Box",
    imageSeed: "gift-box",
    isPublished: true,
    type: BundleType.MixAndMatch,
    createdAt: "2024-09-05T11:30:00Z",
  }),
  createMockBundle({
    id: "bnd-16",
    title: "Design Your Pizza",
    imageSeed: "pizza-box",
    isPublished: true,
    type: BundleType.MixAndMatch,
    createdAt: "2024-11-18T17:00:00Z",
  }),
  createMockBundle({
    id: "bnd-17",
    title: "Pick Your Smoothie",
    imageSeed: "smoothie-mix",
    isPublished: false,
    type: BundleType.MixAndMatch,
    createdAt: "2024-12-08T09:45:00Z",
  }),
  createMockBundle({
    id: "bnd-18",
    title: "Custom Jewelry Set",
    imageSeed: "jewelry-set",
    isPublished: true,
    type: BundleType.MixAndMatch,
    createdAt: "2024-10-12T13:15:00Z",
  }),
  createMockBundle({
    id: "bnd-19",
    title: "Holiday Special Pack",
    imageSeed: "holiday-pack",
    isPublished: true,
    type: BundleType.Custom,
    createdAt: "2024-11-30T10:00:00Z",
  }),
  createMockBundle({
    id: "bnd-20",
    title: "Clearance Bundle",
    imageSeed: "clearance",
    isPublished: false,
    type: BundleType.Custom,
    createdAt: "2024-12-12T14:00:00Z",
  }),
];
