import { and, eq, isNull, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BaseRepository } from "../BaseRepository.js";
import {
  productVariantCostHistory,
  variantCostsCurrent,
  type ProductVariantCostHistory,
  type NewProductVariantCostHistory,
} from "../models";

type Currency = "UAH" | "USD" | "EUR";

export class CostRepository extends BaseRepository {
  async getCurrentCost(input: {
    variantId: string;
    currency: Currency;
  }): Promise<ProductVariantCostHistory | null> {
    const result = await this.connection
      .select()
      .from(variantCostsCurrent)
      .where(
        and(
          eq(variantCostsCurrent.projectId, this.storeId),
          eq(variantCostsCurrent.variantId, input.variantId),
          eq(variantCostsCurrent.currency, input.currency)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Close current cost record for a variant and currency
   * Sets effectiveTo = NOW() on the active record (where effectiveTo IS NULL)
   */
  async closeCurrent(variantId: string, currency: Currency): Promise<void> {
    await this.connection
      .update(productVariantCostHistory)
      .set({ effectiveTo: new Date().toISOString() })
      .where(
        and(
          eq(productVariantCostHistory.projectId, this.storeId),
          eq(productVariantCostHistory.variantId, variantId),
          eq(productVariantCostHistory.currency, currency),
          isNull(productVariantCostHistory.effectiveTo)
        )
      );
  }

  /**
   * Create a new cost record
   * This becomes the current cost (effectiveTo = NULL)
   */
  async create(
    variantId: string,
    data: {
      currency: Currency;
      unitCostMinor: number;
    }
  ): Promise<ProductVariantCostHistory> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const newCost: NewProductVariantCostHistory = {
      projectId: this.storeId,
      id,
      variantId,
      currency: data.currency,
      unitCostMinor: data.unitCostMinor,
      effectiveFrom: now,
      effectiveTo: null,
      recordedAt: now,
    };

    const result = await this.connection
      .insert(productVariantCostHistory)
      .values(newCost)
      .returning();

    return result[0];
  }

  /**
   * Set cost (closes current and creates new in a single operation)
   */
  async setCost(
    variantId: string,
    data: {
      currency: Currency;
      unitCostMinor: number;
    }
  ): Promise<ProductVariantCostHistory> {
    // Close current cost for this variant + currency
    await this.closeCurrent(variantId, data.currency);

    // Create new cost record
    return this.create(variantId, data);
  }

  /**
   * Get active costs for multiple variants (batch loader)
   */
  async getActiveCostsByVariantIds(
    variantIds: readonly string[]
  ): Promise<ProductVariantCostHistory[]> {
    if (variantIds.length === 0) return [];

    return this.connection
      .select()
      .from(productVariantCostHistory)
      .where(
        and(
          eq(productVariantCostHistory.projectId, this.storeId),
          inArray(productVariantCostHistory.variantId, [...variantIds]),
          isNull(productVariantCostHistory.effectiveTo)
        )
      );
  }
}
