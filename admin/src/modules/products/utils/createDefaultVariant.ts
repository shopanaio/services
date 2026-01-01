import { IProductFormVariantValues } from '@modules/products/types';
import { StockStatuses } from '@src/defs/constants';
import { DimensionUnit, EntityStatus, WeightUnit } from '@src/graphql';

export const createDefaultVariant = (): IProductFormVariantValues => {
  return {
    variantSortIndex: -1,
    title: '',
    costPrice: 0,
    cover: null,
    gallery: [],
    id: '',
    inListing: false,
    oldPrice: 0,
    options: [],
    price: 0,
    sku: '',
    slug: '',
    status: EntityStatus.Draft,
    stockStatus: StockStatuses.OUT_OF_STOCK,
    weight: 0,
    weightUnit: WeightUnit.Gr,
    length: 0,
    width: 0,
    height: 0,
    dimensionUnit: DimensionUnit.Mm,
    _isNew: false,
  };
};
