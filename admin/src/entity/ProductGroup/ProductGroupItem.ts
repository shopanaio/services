import { IProductVariant, ProductVariant } from '@src/entity/Product/Variant';
import { ApiProductGroupItem, ProductGroupPriceType } from '@src/graphql';

export interface IProductGroupItem {
  id: ID;
  product: IProductVariant;
  /**
   * Pricing modifier type. Defaults to BASE when not provided.
   */
  priceType?: ProductGroupPriceType;
  /**
   * Absolute/relative price values depending on priceType.
   */
  priceAmountValue?: number | null;
  pricePercentageValue?: number | null;
}

export class ProductGroupItem {
  static create(data: ApiProductGroupItem): IProductGroupItem | null {
    try {
      return {
        id: data.id,
        product: ProductVariant.create(data.variant)!,
        priceType: data.priceType ?? ProductGroupPriceType.Base,
        priceAmountValue: data.priceAmountValue ?? null,
        pricePercentageValue: data.pricePercentageValue ?? null,
      };
    } catch (e) {
      console.error('ProductGroupItem construction failed');
      return null;
    }
  }
}
