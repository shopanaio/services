import type { IMediaFile, EntityStatus } from "@/mocks/products/types";
import type { ApiFile, ApiTag } from "@/graphql/types";

// ============================================================================
// Category Detail Types
// ============================================================================

export interface ICategoryParent {
  id: string;
  title: string;
  slug: string;
}

export interface ICategoryChild {
  id: string;
  title: string;
  slug: string;
  status: EntityStatus;
  productCount: number;
  featured: IMediaFile | null;
}

export interface ICategoryProduct {
  id: string;
  title: string;
  sku: string | null;
  price: number;
  featured: IMediaFile | null;
  status: EntityStatus;
  inStock: boolean;
}

// ============================================================================
// Category (extended for detail view)
// ============================================================================

export interface ICategoryDetail {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  excerpt: string | null;
  status: EntityStatus;
  featured: ApiFile | null;
  gallery: ApiFile[];
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Mock Data Types
// ============================================================================

export interface ICategoryDetailsMockData {
  hierarchy: {
    ancestors: ICategoryParent[];
    children: ICategoryChild[];
  };
  products: {
    items: ICategoryProduct[];
    totalCount: number;
    hasNextPage: boolean;
  };
  tags: ApiTag[];
}

// ============================================================================
// Section Type
// ============================================================================

export type CategorySection =
  | "info"
  | "hierarchy"
  | "products"
  | "media"
  | "seo"
  | "tags";

// ============================================================================
// Component Props
// ============================================================================

export interface ICategoryDetailsCardProps {
  category: ICategoryDetail;
  mockData: ICategoryDetailsMockData;
  onEditSection?: (section: CategorySection) => void;
}
