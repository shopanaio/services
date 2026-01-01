import { FieldNamesMarkedBoolean } from 'react-hook-form';
import {
  IProductFormValues,
  IProductFormVariantValues,
} from '@modules/products/types';
import { mapEntryId } from '@src/utils/utils';
import { getFeaturesPayload } from '@modules/products/utils/getFeaturesPayload';
import {
  ApiUpdateProductVariantInput,
  DimensionUnit,
  WeightUnit,
} from '@src/graphql';
import { NIL_UUID } from '@src/utils/synthetic-id';
import { IProduct } from '@src/entity/Product/Product';
import { IProductVariant } from '@src/entity/Product/Variant';

export const mapApiUpdatedVariant =
  (props: {
    data: IProductFormValues;
    dirtyFields: FieldNamesMarkedBoolean<IProductFormValues>; // Dirty form values
    product: IProduct;
  }) =>
  ([variant, dirtyVariantFields]: [
    variant: Required<IProductFormVariantValues>,
    dirtyFields: FieldNamesMarkedBoolean<IProductFormVariantValues>,
  ]) => {
    const { data, dirtyFields } = props;

    const isFirstVariant = variant.variantSortIndex === 0;

    const result: ApiUpdateProductVariantInput = {
      id: variant.id,
      variantSortIndex: variant.variantSortIndex ?? -1,
    };

    if (dirtyVariantFields.slug) {
      result.slug = variant.slug;
    }

    if (dirtyVariantFields.sku) {
      result.sku = variant.sku;
    }

    if (variant.variantSortIndex > 0) {
      result.inListing = Boolean(variant.inListing);
    } else {
      result.inListing = isFirstVariant;
    }

    if (result.inListing) {
      result.categories = data.categories.map(mapEntryId);
    } else {
      result.categories = [];
    }

    if (dirtyVariantFields.title) {
      result.title = variant.title;
    }

    if (dirtyVariantFields.weight) {
      result.weight = variant.weight;
    }

    if (dirtyVariantFields.weightUnit) {
      result.weightUnit = variant.weightUnit;
    }

    if (dirtyVariantFields.length) {
      result.length = variant.length;
    }

    if (dirtyVariantFields.width) {
      result.width = variant.width;
    }

    if (dirtyVariantFields.height) {
      result.height = variant.height;
    }

    if (dirtyVariantFields.dimensionUnit) {
      result.dimensionUnit = variant.dimensionUnit;
    }

    if (dirtyVariantFields.price) {
      result.price = variant.price;
    }

    if (dirtyVariantFields.oldPrice) {
      result.oldPrice = variant.oldPrice;
    }

    if (dirtyVariantFields.costPrice) {
      result.costPrice = variant.costPrice;
    }

    if (dirtyVariantFields.gallery) {
      result.coverId = variant.gallery[0]?.id || NIL_UUID;
      result.gallery = variant.gallery.map(mapEntryId);
    }

    if (dirtyVariantFields.stockStatus) {
      result.stockStatus = variant.stockStatus;
    }

    if (
      dirtyFields.attributes ||
      dirtyFields.options ||
      dirtyVariantFields.options
    ) {
      result.features = getFeaturesPayload(data.attributes, variant.options);
    }

    return result;
  };

export const getEmbedVariantPayload = (props: {
  data: IProductFormValues;
  dirtyFields: FieldNamesMarkedBoolean<IProductFormValues>; // Dirty form values
  variant: IProductVariant;
}) => {
  const { data, dirtyFields, variant } = props;

  const result: ApiUpdateProductVariantInput = {
    id: variant.id,
    variantSortIndex: 0,
    inListing: true,
  };

  if (dirtyFields.slug) {
    result.slug = data.slug;
  }

  if (dirtyFields.sku) {
    result.sku = data.sku;
  }

  if (result.inListing) {
    result.categories = data.categories.map(mapEntryId);
  } else {
    result.categories = [];
  }

  if (dirtyFields.title) {
    result.title = data.title;
  }

  if (dirtyFields.weight) {
    result.weight = data.weight || 0;
  }

  if (dirtyFields.weightUnit) {
    result.weightUnit = data.weightUnit || WeightUnit.Gr;
  }

  if (dirtyFields.length) {
    result.length = data.length || 0;
  }

  if (dirtyFields.width) {
    result.width = data.width || 0;
  }

  if (dirtyFields.height) {
    result.height = data.height || 0;
  }

  if (dirtyFields.dimensionUnit) {
    result.dimensionUnit = data.dimensionUnit || DimensionUnit.Cm;
  }

  if (dirtyFields.price) {
    result.price = data.price;
  }

  if (dirtyFields.oldPrice) {
    result.oldPrice = data.oldPrice;
  }

  if (dirtyFields.costPrice) {
    result.costPrice = data.costPrice;
  }

  if (dirtyFields.gallery) {
    result.coverId = data.gallery[0]?.id || NIL_UUID;
    result.gallery = data.gallery.map(mapEntryId);
  }

  if (dirtyFields.stockStatus) {
    result.stockStatus = data?.stockStatus;
  }

  return result;
};
