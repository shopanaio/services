import { IProductFormVariantValues } from '@modules/products/types';
import { ApiUpdateProductVariantInput } from '@src/graphql';
import { NIL_UUID } from '@src/utils/synthetic-id';
import { mapEntryId } from '@src/utils/utils';
import { FieldNamesMarkedBoolean } from 'react-hook-form';

export const getEditVariantPayload = (props: {
  data: IProductFormVariantValues;
  dirtyFields: FieldNamesMarkedBoolean<IProductFormVariantValues>;
}) => {
  const { data, dirtyFields } = props;

  const result: ApiUpdateProductVariantInput = {
    id: data.id,
  };

  if (dirtyFields.title) {
    result.title = data.title;
  }

  if (dirtyFields.slug) {
    result.slug = data.slug;
  }

  if (dirtyFields.weight) {
    result.weight = data.weight;
  }

  if (dirtyFields.sku) {
    result.sku = data.sku;
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
    result.stockStatus = data.stockStatus;
  }

  if (dirtyFields.weight) {
    result.weight = data.weight;
  }

  if (dirtyFields.weightUnit) {
    result.weightUnit = data.weightUnit;
  }

  if (dirtyFields.length) {
    result.length = data.length;
  }

  if (dirtyFields.width) {
    result.width = data.width;
  }

  if (dirtyFields.height) {
    result.height = data.height;
  }

  if (dirtyFields.dimensionUnit) {
    result.dimensionUnit = data.dimensionUnit;
  }

  return result;
};
