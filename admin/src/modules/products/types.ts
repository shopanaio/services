import { IProductGroupFormValues } from '@modules/products/components/groups/schema';
import { CustomVariantField } from '@modules/products/defs';
import { ICategory } from '@src/entity/Category/Category';
import { IDescriptionFields } from '@src/entity/Content/description';
import { IMediaFile } from '@src/entity/MediaFile/MediaFile';
import { IProductFeatureGroup } from '@src/entity/Product/ProductFeature';
import { IProductVariantOption } from '@src/entity/Product/Variant';
import { ITag } from '@src/entity/Tag/Tag';
import { DimensionUnit, EntityStatus, WeightUnit } from '@src/graphql';

export interface IProductFormValues {
  id: ID;
  costPrice: number;
  attributes: IProductFeatureGroup[];
  primaryCategoryId: ID | null;
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
  // Dimension fields
  length: number;
  width: number;
  height: number;
  dimensionUnit: DimensionUnit;
  groups: IProductGroupFormValues[];
  variants: IProductFormVariantValues[];
}

export interface IProductFormVariantValues {
  id: ID;
  //
  title: string;
  slug: string;
  status: EntityStatus;
  gallery: IMediaFile[];
  options: IProductVariantOption[];
  // tags: IContentRecord[];
  sku: string;
  price: number;
  costPrice: number;
  oldPrice: number;
  stockStatus: string;
  inListing: boolean;
  weight: number;
  weightUnit: WeightUnit;
  // Dimension fields (optional for variants)
  length: number;
  width: number;
  height: number;
  dimensionUnit: DimensionUnit;
  variantSortIndex: number;
}
