import { and, eq, isNull, inArray } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  variant,
  variantTranslation,
  itemPricing,
  itemDimensions,
  itemWeight,
  variantMedia,
  warehouseStock,
  productOptionVariantLink,
  type Variant,
  type VariantTranslation,
  type ItemPricing,
  type ItemDimensions,
  type ItemWeight,
  type VariantMedia,
  type WarehouseStock,
  type ProductOptionVariantLink,
} from "../models/index.js";
import { getContext } from "../../context/index.js";

export class VariantLoaderQueryRepository extends BaseRepository {
  private get locale(): string {
    return getContext().locale ?? "uk";
  }

  async getByIds(variantIds: readonly string[]): Promise<Variant[]> {
    return this.connection
      .select()
      .from(variant)
      .where(
        and(
          eq(variant.projectId, this.projectId),
          inArray(variant.id, [...variantIds]),
          isNull(variant.deletedAt)
        )
      );
  }

  async getIdsByProductIds(
    productIds: readonly string[]
  ): Promise<Array<{ id: string; productId: string }>> {
    return this.connection
      .select({ id: variant.id, productId: variant.productId })
      .from(variant)
      .where(
        and(
          eq(variant.projectId, this.projectId),
          inArray(variant.productId, [...productIds]),
          isNull(variant.deletedAt)
        )
      );
  }

  async getTranslationsByVariantIds(
    variantIds: readonly string[]
  ): Promise<VariantTranslation[]> {
    return this.connection
      .select()
      .from(variantTranslation)
      .where(
        and(
          eq(variantTranslation.projectId, this.projectId),
          inArray(variantTranslation.variantId, [...variantIds]),
          eq(variantTranslation.locale, this.locale)
        )
      );
  }

  async getActivePricingByVariantIds(
    variantIds: readonly string[]
  ): Promise<ItemPricing[]> {
    return this.connection
      .select()
      .from(itemPricing)
      .where(
        and(
          eq(itemPricing.projectId, this.projectId),
          inArray(itemPricing.variantId, [...variantIds]),
          isNull(itemPricing.effectiveTo)
        )
      );
  }

  async getPricingByIds(priceIds: readonly string[]): Promise<ItemPricing[]> {
    return this.connection
      .select()
      .from(itemPricing)
      .where(
        and(
          eq(itemPricing.projectId, this.projectId),
          inArray(itemPricing.id, [...priceIds])
        )
      );
  }

  async getPriceIdsByVariantIds(
    variantIds: readonly string[]
  ): Promise<Array<{ id: string; variantId: string }>> {
    return this.connection
      .select({ id: itemPricing.id, variantId: itemPricing.variantId })
      .from(itemPricing)
      .where(
        and(
          eq(itemPricing.projectId, this.projectId),
          inArray(itemPricing.variantId, [...variantIds])
        )
      );
  }

  async getDimensionsByVariantIds(
    variantIds: readonly string[]
  ): Promise<ItemDimensions[]> {
    return this.connection
      .select()
      .from(itemDimensions)
      .where(
        and(
          eq(itemDimensions.projectId, this.projectId),
          inArray(itemDimensions.variantId, [...variantIds])
        )
      );
  }

  async getWeightsByVariantIds(
    variantIds: readonly string[]
  ): Promise<ItemWeight[]> {
    return this.connection
      .select()
      .from(itemWeight)
      .where(
        and(
          eq(itemWeight.projectId, this.projectId),
          inArray(itemWeight.variantId, [...variantIds])
        )
      );
  }

  async getMediaByVariantIds(
    variantIds: readonly string[]
  ): Promise<VariantMedia[]> {
    return this.connection
      .select()
      .from(variantMedia)
      .where(
        and(
          eq(variantMedia.projectId, this.projectId),
          inArray(variantMedia.variantId, [...variantIds])
        )
      );
  }

  async getStockByVariantIds(
    variantIds: readonly string[]
  ): Promise<WarehouseStock[]> {
    return this.connection
      .select()
      .from(warehouseStock)
      .where(
        and(
          eq(warehouseStock.projectId, this.projectId),
          inArray(warehouseStock.variantId, [...variantIds])
        )
      );
  }

  async getSelectedOptionsByVariantIds(
    variantIds: readonly string[]
  ): Promise<ProductOptionVariantLink[]> {
    return this.connection
      .select()
      .from(productOptionVariantLink)
      .where(
        and(
          eq(productOptionVariantLink.projectId, this.projectId),
          inArray(productOptionVariantLink.variantId, [...variantIds])
        )
      );
  }
}
