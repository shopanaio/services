import { Category, ICategory } from '@src/entity/Category/Category';
import { Swatch } from '@src/entity/Feature/Swatch';
import { IMediaFile, MediaFile } from '@src/entity/MediaFile/MediaFile';
import {
  IProductFeature,
  IProductFeatureGroup,
} from '@src/entity/Product/ProductFeature';
import { IProductVariant, ProductVariant } from '@src/entity/Product/Variant';
import {
  IProductGroup,
  ProductGroup,
} from '@src/entity/ProductGroup/ProductGroup';
import { ITag, Tag } from '@src/entity/Tag/Tag';
import { sanitizeEntries } from '@src/entity/utils';
import {
  ApiProduct,
  ApiProductFeature,
  ApiVariant,
  DimensionUnit,
  EntityStatus,
  WeightUnit,
} from '@src/graphql';
import { uniqBy } from 'lodash';

export interface IProduct {
  attributes: IProductFeatureGroup[];
  categories: ICategory[];
  primaryCategory: { id: ID; title: string } | null;
  container: IProduct | null;
  containerId: ID;
  costPrice: number;
  cover: IMediaFile | null;
  createdAt: Date;
  description: string | null;
  excerpt: string | null;
  gallery: IMediaFile[];
  groups: IProductGroup[];
  id: ID;
  isVariant: false;
  oldPrice: number;
  options: IProductFeatureGroup[];
  price: number;
  requiresShipping: boolean;
  seoDescription: string | null;
  seoTitle: string | null;
  sku: string | null;
  slug: string;
  status: EntityStatus;
  stockStatus: string;
  tags: ITag[];
  title: string;
  updatedAt: Date;
  variants: IProductVariant[];
  weight: number | null;
  weightUnit: WeightUnit;
  // Dimension fields
  length: number | null;
  width: number | null;
  height: number | null;
  /**
   * Dimension unit presented in lower-case string form (e.g. "mm", "cm").
   */
  dimensionUnit: DimensionUnit;
  //
  variantId: string | null;
  embedVariant: IProductVariant | null;
  isVariableProduct: boolean;
  __typename?: 'ProductContainer';
}

export class Product {
  static create(
    data: ApiProduct,
    options: { includeContainer?: boolean } = {},
  ): IProduct | null {
    const { variants } = data;

    if (!variants?.length) {
      console.error('Product has no variants', data);
      return null;
    }

    const [variant] = variants;

    // Use V2 features if available, fallback to V1
    const allFeatures = Product.collectFeaturesV2(variants || []);
    const allOptions = Product.deserializeOptions(allFeatures);
    const allAttributes = Product.deserializeAttributes(allFeatures);

    const isVariableProduct = allOptions.length > 0;
    const sharedData = isVariableProduct ? data : variant;

    const allCategories = Product.deserializeCategories(variants);
    const allTags = sanitizeEntries(data.tags?.map(Tag.create));
    const lastUpdatedAt = new Date(
      Math.max(...variants.map((it) => new Date(it.updatedAt).getTime())),
    );

    try {
      const product = {
        // Variant data
        costPrice: variant.costPrice,
        cover: variant.cover ? MediaFile.create(variant.cover) : null,
        gallery: sanitizeEntries(variant.gallery?.map(MediaFile.create)),
        oldPrice: variant.oldPrice,
        price: variant.price,
        sku: variant.sku || '',
        status: data.status,
        stockStatus: variant.stockStatus,
        weight: variant.weight || null,
        weightUnit: variant.weightUnit,
        // Dimensions copied from representative variant
        length: variant.length ?? 0,
        width: variant.width ?? 0,
        height: variant.height ?? 0,
        dimensionUnit: variant.dimensionUnit || DimensionUnit.Mm,

        // Shared data
        title: data.title,
        description: data.description || null,
        excerpt: data.excerpt || null,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        slug: data.slug,
        createdAt: new Date(sharedData.createdAt),
        updatedAt: new Date(lastUpdatedAt),
        // For a single variant product
        variantId: isVariableProduct ? null : variant.id,

        // Container data
        // Attributes contain all features including options
        // Non-attribute options marked as isAttribute:false
        attributes: allAttributes,
        primaryCategory: data.primaryCategory || null,
        // Options contain only features marked as isOption:true
        groups: sanitizeEntries((data.groups || []).map(ProductGroup.create)),
        options: allOptions,
        categories: allCategories,
        tags: allTags,
        container: null,
        containerId: data.id,
        id: data.id,
        requiresShipping: data.requiresShipping,
        variants: [],
        isVariant: false,
        embedVariant: null,
        isVariableProduct,
        __typename: 'ProductContainer',
      } as IProduct;

      const embedVariant = isVariableProduct
        ? null
        : Product.createVariant(
            variant,
            product.status,
            options?.includeContainer ? product : null,
          );

      if (embedVariant) {
        product.embedVariant = embedVariant;
      }

      /**
       * If product is a single variant but with options we still need to add variants as a value
       */
      if (isVariableProduct) {
        product.variants = sanitizeEntries(
          data.variants?.map((it) =>
            Product.createVariant(it, product.status, product),
          ),
        ).map((it, idx, { length }) => {
          return {
            ...it,
            variantSortIndex: it.variantSortIndex ?? idx,
            container: options?.includeContainer ? { ...product } : null,
            containerId: product.id,
            isLastVariant: idx === length - 1,
          };
        });
      }

      return product;
    } catch (e) {
      console.error('Product construction failed', e);
      return null;
    }
  }

  static collectFeatures = (variants: ApiVariant[]) => {
    return uniqBy(
      variants.flatMap((it) => it.features) as ApiProductFeature[],
      (it) => it.featureId,
    );
  };

  /**
   * Collect features from variants with V2 support (fallback to V1)
   */
  static collectFeaturesV2 = (variants: ApiVariant[]) => {
    return uniqBy(
      variants.flatMap(
        (it) => it.featuresV2 || it.features,
      ) as ApiProductFeature[],
      (it) => it.featureId,
    );
  };

  static deserializeCategories = (variants: ApiVariant[]) => {
    return uniqBy(
      sanitizeEntries(variants.flatMap((it) => it.categories)),
      'id',
    ).map(Category.create);
  };

  static deserializeAttributes = (
    features: ApiProductFeature[],
  ): IProductFeatureGroup[] => {
    if (!Array.isArray(features)) {
      return [];
    }

    return [...features]
      .sort((a, b) => a.attributeSortIndex! - b.attributeSortIndex!)
      .reduce((acc, apiFeature) => {
        const { group: apiGroup } = apiFeature;
        const groupIdx = acc.findIndex((g) => g.id === apiGroup.id);

        const productFeature: IProductFeature = {
          id: apiFeature.featureId,
          title: apiFeature.title,
          slug: apiFeature.slug,
          style: apiGroup.featureStyleType,
          swatch: apiFeature.swatch ? Swatch.create(apiFeature.swatch) : null,
          group: {
            id: apiGroup.id,
            slug: apiGroup.slug,
            title: apiGroup.title,
            style: apiGroup.featureStyleType,
            isActive: apiFeature.isAttribute,
            isOption: apiFeature.isOption,
            isEditing: false,
            features: [],
          },
        };

        if (groupIdx !== -1) {
          acc[groupIdx].features.push(productFeature);
          return acc;
        }

        const group: IProductFeatureGroup = {
          ...apiGroup,
          title: apiGroup.title,
          features: [productFeature],
          isActive: apiFeature.isAttribute,
          isOption: apiFeature.isOption,
          style: apiGroup.featureStyleType,
          isEditing: false,
        };

        return [...acc, group];
      }, [] as IProductFeatureGroup[]);
  };

  static deserializeOptions = (
    features: ApiProductFeature[],
  ): IProductFeatureGroup[] => {
    if (!Array.isArray(features)) {
      return [];
    }

    return [...features]
      .filter((it) => it.isOption)
      .sort((a, b) => a.optionSortIndex! - b.optionSortIndex!)
      .reduce((acc, apiFeature) => {
        const { group: apiGroup } = apiFeature;
        const groupIdx = acc.findIndex((g) => g.id === apiGroup.id);

        const productFeature: IProductFeature = {
          id: apiFeature.featureId,
          title: apiFeature.title,
          slug: apiFeature.slug,
          style: apiGroup.featureStyleType,
          swatch: apiFeature.swatch ? Swatch.create(apiFeature.swatch) : null,
          group: {
            id: apiGroup.id,
            slug: apiGroup.slug,
            title: apiGroup.title,
            style: apiGroup.featureStyleType,
            isActive: apiFeature.isAttribute,
            isOption: apiFeature.isOption,
            isEditing: false,
            features: [],
          },
        };

        if (groupIdx !== -1) {
          acc[groupIdx].features.push(productFeature);
          return acc;
        }

        const group: IProductFeatureGroup = {
          ...apiGroup,
          isEditing: false,
          title: apiGroup.title,
          slug: apiGroup.slug,
          features: [productFeature],
          style: apiGroup.featureStyleType,
          isActive: apiFeature.isAttribute,
          isOption: apiFeature.isOption,
        };

        return [...acc, group];
      }, [] as IProductFeatureGroup[]);
  };

  static createVariant = (
    data: ApiVariant,
    status: EntityStatus,
    container: IProduct | null,
  ): IProductVariant | null => {
    const variant = ProductVariant.create(data);

    if (!variant) {
      return null;
    }

    return {
      ...variant,
      status,
      container,
    };
  };
}
