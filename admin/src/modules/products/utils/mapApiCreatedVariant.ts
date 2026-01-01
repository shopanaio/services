import { mapEntryId } from '@src/utils/utils';
import { IProductFormValues } from '@modules/products/types';
import { ApiCreateProductVariantInput, DimensionUnit } from '@src/graphql';
import { getFeaturesPayload } from '@modules/products/utils/getFeaturesPayload';
import { StockStatuses } from '@src/defs/constants';
import { NIL_UUID, syntheticId } from '@src/utils/synthetic-id';
import { IProduct } from '@src/entity/Product/Product';

// New variant cannot be dirty.
export const mapApiCreatedVariant = (
  data: IProductFormValues,
  variant: Required<IProductFormValues['variants'][number]>,
  product?: IProduct,
) => {
  const isFirstVariant = variant.variantSortIndex === 0;

  const result: ApiCreateProductVariantInput = {
    ...(data.cover ? { coverId: mapEntryId(data.cover) } : {}),
    title: data.title,
    categories: data.categories.map(mapEntryId),
    features: getFeaturesPayload(data.attributes, variant.options),
    gallery: data.gallery.map(mapEntryId),
    oldPrice: data.oldPrice,
    price: data.price,
    sku:
      (product?.options || []).length > 0
        ? variant.sku
        : isFirstVariant
        ? data.sku
        : '',
    slug: `${variant.slug}-${syntheticId()}`,
    stockStatus: data.stockStatus || StockStatuses.IN_STOCK,
    weight: data.weight || 0,
    weightUnit: variant.weightUnit,
    dimensionUnit: data.dimensionUnit || DimensionUnit.Mm,
    length: data.length || 0,
    width: data.width || 0,
    height: data.height || 0,
    variantSortIndex: variant.variantSortIndex ?? -1,
    inListing: isFirstVariant,
  };

  result.title = variant.title || '';
  result.weight = variant.weight || 0;
  result.weightUnit = variant.weightUnit;
  result.dimensionUnit = variant.dimensionUnit;
  result.length = variant.length;
  result.width = variant.width;
  result.height = variant.height;
  result.price = variant.price;
  result.oldPrice = variant.oldPrice;
  result.costPrice = variant.costPrice;

  if (variant.cover) {
    result.coverId = variant?.cover?.id || NIL_UUID;
  } else {
    delete result.coverId;
  }

  result.gallery = (variant.gallery || []).map(mapEntryId);

  if (variant.stockStatus) {
    result.stockStatus = variant.stockStatus;
  } else {
    result.stockStatus = 'in_stock';
  }

  if (variant.variantSortIndex > 0) {
    result.inListing = Boolean(variant.inListing);
  }

  return result;
};
