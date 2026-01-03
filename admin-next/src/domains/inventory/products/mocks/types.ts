/**
 * Mock types for ProductInfoCardA component
 * These are simplified interfaces for development/testing purposes
 */

// ============================================================================
// Enums (mock replacements for GraphQL types)
// ============================================================================

export enum EntityStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum WeightUnit {
  G = 'G',
  KG = 'KG',
  LB = 'LB',
  OZ = 'OZ',
}

export enum DimensionUnit {
  MM = 'MM',
  CM = 'CM',
  M = 'M',
  IN = 'IN',
}

export enum FeatureStyleType {
  DEFAULT = 'DEFAULT',
  COLOR = 'COLOR',
  IMAGE = 'IMAGE',
}

export enum FeatureSwatchType {
  NONE = 'NONE',
  COLOR = 'COLOR',
  TWO_COLOR = 'TWO_COLOR',
  IMAGE = 'IMAGE',
}

export enum FileDriver {
  LOCAL = 'LOCAL',
  S3 = 'S3',
}

export enum ProductGroupPriceType {
  FIXED = 'FIXED',
  PERCENTAGE = 'PERCENTAGE',
}

// ============================================================================
// Base Types
// ============================================================================

type ID = string;

// ============================================================================
// Media File
// ============================================================================

export interface IMediaFile {
  id: ID;
  url: string;
  name: string;
  size: number;
  ext: string;
  driver: FileDriver;
  key: string;
  createdAt?: string;
}

// ============================================================================
// Category
// ============================================================================

export interface ICategory {
  id: ID;
  title: string;
  slug: string;
  description: string | null;
  excerpt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  status: EntityStatus;
  createdAt: Date;
  updatedAt: Date;
  cover: IMediaFile | null;
  gallery: IMediaFile[];
}

// ============================================================================
// Tag
// ============================================================================

export interface ITag {
  id: ID;
  title: string;
  slug: string;
  color: string;
}

// ============================================================================
// Swatch
// ============================================================================

export interface ISwatch {
  id: ID;
  color1: string | null;
  color2: string | null;
  image: IMediaFile | null;
  type: FeatureSwatchType;
}

// ============================================================================
// Product Features
// ============================================================================

export interface IProductFeature {
  id: ID;
  slug: string;
  title: string;
  swatch: ISwatch | null;
  style: FeatureStyleType;
  group: IProductFeatureGroup;
}

export interface IProductFeatureGroup {
  id: ID;
  slug: string;
  title: string;
  features: IProductFeature[];
  style: FeatureStyleType;
  isOption?: boolean;
  isActive?: boolean;
  isEditing?: boolean;
}

// ============================================================================
// Product Variant
// ============================================================================

export interface IProductVariantOption {
  id: ID;
  slug: string;
  title: string;
  swatch: ISwatch | null;
  style: FeatureStyleType;
  group: IProductFeatureGroup;
}

export interface IProductVariant {
  id: ID;
  containerId: ID;
  title: string;
  slug: string;
  price: number;
  oldPrice: number;
  costPrice: number;
  sku: string | null;
  cover: IMediaFile | null;
  gallery: IMediaFile[];
  weight: number | null;
  weightUnit: WeightUnit;
  length: number | null;
  width: number | null;
  height: number | null;
  dimensionUnit: DimensionUnit;
  stockStatus: string;
  status: EntityStatus;
  createdAt: Date;
  updatedAt: Date;
  isVariant: true;
  isLastVariant?: boolean;
  variantSortIndex: number;
  listingSortIndex?: string | null;
  inListing: boolean;
  categories: ICategory[];
  options: IProductVariantOption[];
  container: IProduct | null;
  _isNew?: boolean;
  _isDeleted?: boolean;
}

// ============================================================================
// Product Group
// ============================================================================

export interface IProductGroupItem {
  id: ID;
  product: IProductVariant;
  priceType?: ProductGroupPriceType;
  priceAmountValue?: number | null;
  pricePercentageValue?: number | null;
}

export interface IProductGroup {
  id: ID;
  title: string;
  isMultiple: boolean;
  isRequired: boolean;
  managedVariants: boolean;
  sortIndex: number;
  items: IProductGroupItem[];
}

// ============================================================================
// Product (Main Entity)
// ============================================================================

export interface IProduct {
  id: ID;
  title: string;
  description: string | null;
  excerpt: string | null;
  slug: string;
  status: EntityStatus;
  price: number;
  oldPrice: number;
  costPrice: number;
  sku: string | null;
  cover: IMediaFile | null;
  gallery: IMediaFile[];
  weight: number | null;
  weightUnit: WeightUnit;
  length: number | null;
  width: number | null;
  height: number | null;
  dimensionUnit: DimensionUnit;
  stockStatus: string;
  requiresShipping: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
  isVariant: false;
  isVariableProduct: boolean;
  variantId: string | null;
  variants: IProductVariant[];
  embedVariant: IProductVariant | null;
  categories: ICategory[];
  primaryCategory: { id: ID; title: string } | null;
  tags: ITag[];
  attributes: IProductFeatureGroup[];
  options: IProductFeatureGroup[];
  groups: IProductGroup[];
  container: IProduct | null;
  containerId: ID;
}
