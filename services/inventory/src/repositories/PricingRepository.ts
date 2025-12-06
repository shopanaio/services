import { and, eq, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BaseRepository } from "./BaseRepository.js";
import { itemPricing, type ItemPricing, type NewItemPricing } from "./models";

type Currency = "UAH" | "USD" | "EUR";

export class PricingRepository extends BaseRepository {
  /**
   * Close current price record for a variant and currency
   * Sets effectiveTo = NOW() on the active record (where effectiveTo IS NULL)
   */
  async closeCurrent(variantId: string, currency: Currency): Promise<void> {
    await this.connection
      .update(itemPricing)
      .set({ effectiveTo: new Date() })
      .where(
        and(
          eq(itemPricing.projectId, this.projectId),
          eq(itemPricing.variantId, variantId),
          eq(itemPricing.currency, currency),
          isNull(itemPricing.effectiveTo)
        )
      );
  }

  /**
   * Create a new pricing record
   * This becomes the current price (effectiveTo = NULL)
   */
  async create(
    variantId: string,
    data: {
      currency: Currency;
      amountMinor: number;
      compareAtMinor?: number | null;
    }
  ): Promise<ItemPricing> {
    const id = randomUUID();
    const now = new Date();

    const newPricing: NewItemPricing = {
      projectId: this.projectId,
      id,
      variantId,
      currency: data.currency,
      amountMinor: data.amountMinor,
      compareAtMinor: data.compareAtMinor ?? null,
      effectiveFrom: now,
      effectiveTo: null,
      recordedAt: now,
    };

    const result = await this.connection
      .insert(itemPricing)
      .values(newPricing)
      .returning();

    return result[0];
  }

  /**
   * Set price (closes current and creates new in a single operation)
   */
  async setPrice(
    variantId: string,
    data: {
      currency: Currency;
      amountMinor: number;
      compareAtMinor?: number | null;
    }
  ): Promise<ItemPricing> {
    // Close current price for this variant + currency
    await this.closeCurrent(variantId, data.currency);

    // Create new price record
    return this.create(variantId, data);
  }
}
