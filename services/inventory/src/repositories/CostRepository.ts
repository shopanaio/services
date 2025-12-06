import { and, eq, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BaseRepository } from "./BaseRepository.js";
import {
  productVariantCostHistory,
  type ProductVariantCostHistory,
  type NewProductVariantCostHistory,
} from "./models";

type Currency = "UAH" | "USD" | "EUR";

export class CostRepository extends BaseRepository {
  /**
   * Close current cost record for a variant and currency
   * Sets effectiveTo = NOW() on the active record (where effectiveTo IS NULL)
   */
  async closeCurrent(variantId: string, currency: Currency): Promise<void> {
    await this.db
      .update(productVariantCostHistory)
      .set({ effectiveTo: new Date() })
      .where(
        and(
          eq(productVariantCostHistory.projectId, this.projectId),
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
    const now = new Date();

    const newCost: NewProductVariantCostHistory = {
      projectId: this.projectId,
      id,
      variantId,
      currency: data.currency,
      unitCostMinor: data.unitCostMinor,
      effectiveFrom: now,
      effectiveTo: null,
      recordedAt: now,
    };

    const result = await this.db
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
}
