// Enums (copied from old admin GraphQL types)
export enum EntityStatus {
  Draft = 'Draft',
  Published = 'Published',
  Archived = 'Archived',
}

export enum WeightUnit {
  Gr = 'Gr',
  Kg = 'Kg',
  Lb = 'Lb',
  Oz = 'Oz',
}

export enum DimensionUnit {
  Cm = 'Cm',
  Mm = 'Mm',
  M = 'M',
  In = 'In',
}

export const StockStatuses = {
  IN_STOCK: 'IN_STOCK',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  PREORDER: 'PREORDER',
} as const;

export type StockStatus = typeof StockStatuses[keyof typeof StockStatuses];

// Media file type
export interface IMediaFile {
  id: string;
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

// Category type
export interface ICategory {
  id: string;
  title: string;
  slug?: string;
}

// Tag type
export interface ITag {
  id: string;
  title: string;
}

// Product feature/option value
export interface IProductFeatureValue {
  id: string;
  title: string;
  sortIndex?: number;
}

// Product feature group (for options and attributes)
export interface IProductFeatureGroup {
  id: string;
  title: string;
  values: IProductFeatureValue[];
  isEditing?: boolean;
}

// Variant option (link between variant and option value)
export interface IProductVariantOption {
  optionId: string;
  optionTitle: string;
  valueId: string;
  valueTitle: string;
}

// Description fields
export interface IDescriptionFields {
  text: string;
  html: string;
  json: Record<string, any>;
}

// Product group form values (for bundles)
export interface IProductGroupFormValues {
  id: string;
  title: string;
  items: {
    id: string;
    productId: string;
    quantity: number;
  }[];
}

// Product variant form values
export interface IProductFormVariantValues {
  id: string;
  title: string;
  slug: string;
  status: EntityStatus;
  gallery: IMediaFile[];
  options: IProductVariantOption[];
  sku: string;
  price: number;
  costPrice: number;
  oldPrice: number;
  stockStatus: string;
  inListing: boolean;
  weight: number;
  weightUnit: WeightUnit;
  length: number;
  width: number;
  height: number;
  dimensionUnit: DimensionUnit;
  variantSortIndex: number;
}

// Main product form values
export interface IProductFormValues {
  id: string;
  costPrice: number;
  attributes: IProductFeatureGroup[];
  primaryCategoryId: string | null;
  categories: ICategory[];
  cover: IMediaFile | null;
  description: IDescriptionFields | null;
  seoTitle: string;
  seoDescription: string;
  excerpt: string;
  gallery: IMediaFile[];
  oldPrice: number;
  options: IProductFeatureGroup[];
  price: number;
  requiresShipping: boolean;
  sku: string;
  slug: string;
  status: EntityStatus;
  stockStatus: string;
  tags: ITag[];
  title: string;
  weight: number;
  weightUnit: WeightUnit;
  length: number;
  width: number;
  height: number;
  dimensionUnit: DimensionUnit;
  groups: IProductGroupFormValues[];
  variants: IProductFormVariantValues[];
}

// Default values for product form
export const defaultProductFormValues: IProductFormValues = {
  id: '',
  attributes: [],
  categories: [],
  title: '',
  description: null,
  excerpt: '',
  cover: null,
  gallery: [],
  options: [],
  variants: [],
  price: 0,
  oldPrice: 0,
  primaryCategoryId: null,
  costPrice: 0,
  sku: '',
  slug: '',
  status: EntityStatus.Draft,
  tags: [],
  stockStatus: StockStatuses.IN_STOCK,
  weight: 0,
  requiresShipping: true,
  groups: [],
  weightUnit: WeightUnit.Gr,
  length: 0,
  width: 0,
  height: 0,
  dimensionUnit: DimensionUnit.Cm,
  seoTitle: '',
  seoDescription: '',
};
