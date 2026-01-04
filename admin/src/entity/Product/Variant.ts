import {
  ApiVariant,
  DimensionUnit,
  EntityStatus,
  WeightUnit,
} from '@src/graphql';

import { IMediaFile, MediaFile } from '@src/entity/MediaFile/MediaFile';
import {
  IProductFeature,
  IProductFeatureGroup,
  ProductFeature,
} from '@src/entity/Product/ProductFeature';
import { sanitizeEntries } from '@src/entity/utils';

import { IProduct, Product } from '@src/entity/Product/Product';
import { Category, ICategory } from '@src/entity/Category/Category';

export interface IProductVariantOption extends IProductFeature {
  group: IProductFeatureGroup;
}

export interface IProductVariant {
  categories: ICategory[];
  container: IProduct | null;
  containerId: ID;
  title: string;
  costPrice: number;
  cover: IMediaFile | null;
  createdAt: Date;
  gallery: IMediaFile[];
  id: ID;
  inListing: boolean;
  isLastVariant?: boolean;
  isVariant: true;
  oldPrice: number;
  options: IProductVariantOption[];
  price: number;
  // rating?: number;
  sku: string | null;
  slug: string;
  status: EntityStatus;
  stockStatus: string;
  updatedAt: Date;
  weight: number | null;
  variantSortIndex: number;
  weightUnit: WeightUnit;
  // Dimension fields
  length: number | null;
  width: number | null;
  height: number | null;
  /**
   * Dimension unit presented in lower-case string form (e.g. "mm", "cm").
   */
  dimensionUnit: string;
  __typename?: 'Variant';
  // For listing table
  listingSortIndex?: string | null;
}

export class ProductVariant {
  static create = (data: ApiVariant): IProductVariant | null => {
    try {
      return {
        containerId: data.containerId,
        categories: sanitizeEntries(data.categories?.map(Category.create)),
        title: data.title,
        costPrice: data.costPrice || 0,
        cover: data.cover ? MediaFile.create(data.cover) : null,
        createdAt: new Date(data.createdAt),
        gallery: sanitizeEntries(data.gallery?.map(MediaFile.create)),
        id: data.id,
        isVariant: true,
        oldPrice: data.oldPrice || 0,
        options: ProductFeature.flattenFeatures(
          Product.deserializeOptions(data.featuresV2), // Temporary: testing v2 only
        ),
        price: data.price,
        sku: data.sku || '',
        slug: data.slug,
        stockStatus: data.stockStatus,
        updatedAt: new Date(data.updatedAt),
        weight: data.weight || 0,
        weightUnit: data.weightUnit || WeightUnit.Gr,
        // Dimensions
        length: data.length ?? 0,
        width: data.width ?? 0,
        height: data.height ?? 0,
        dimensionUnit: data.dimensionUnit || DimensionUnit.Mm,
        listingSortIndex: data.listingSortIndex || null,
        variantSortIndex: data.variantSortIndex,
        inListing: data.inListing || false,
        __typename: 'Variant',
        // Must be overridden by container
        container: null,
        status: EntityStatus.Draft,
      };
    } catch (e) {
      console.error('Product variant construction failed', e);
      return null;
    }
  };
}

export interface IListingProduct {
  id: ID;
  title: string;
  cover: IMediaFile | null;
  isVariant: true;
  options: IProductVariantOption[];
  containerId: ID;
  __typename?: 'Variant';
}

export class ListingProduct {
  static create = (data: ApiVariant): IListingProduct | null => {
    try {
      let title = data.title;
      if (data.containerTitle) {
        title = `${data.containerTitle} ${title}`;
      }
      return {
        title,
        containerId: data.containerId,
        cover: data.cover ? MediaFile.create(data.cover) : null,
        id: data.id,
        isVariant: true,
        options: ProductFeature.flattenFeatures(
          Product.deserializeOptions(data.featuresV2), // Temporary: testing v2 only
        ),
        __typename: 'Variant',
      };
    } catch (e) {
      console.error('Product variant construction failed', e);
      return null;
    }
  };
}
