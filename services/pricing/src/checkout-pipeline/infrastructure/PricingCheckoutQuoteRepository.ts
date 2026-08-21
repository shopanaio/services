import { and, eq } from "drizzle-orm";
import type { Pricing } from "@shopana/broker-types";
import type { Database } from "../../infrastructure/db/database.js";
import { checkoutFinalQuote, checkoutPreliminaryQuote } from "../../repositories/models/index.js";
import { PricingCheckoutError } from "../errors.js";
import {
  finalCheckoutQuoteResultSchema,
  preliminaryCheckoutQuoteResultSchema,
} from "../schemas.js";

type Attempt = {
  storeId: string;
  checkoutId: string;
  executionId: string;
  requestDigest: string;
};

export class PricingCheckoutQuoteRepository {
  constructor(private readonly db: Database) {}

  async findPreliminary(
    input: Attempt,
  ): Promise<Pricing.CalculateCheckoutPreliminaryQuoteResult | null> {
    const row = (
      await this.db
        .select()
        .from(checkoutPreliminaryQuote)
        .where(
          and(
            eq(checkoutPreliminaryQuote.storeId, input.storeId),
            eq(checkoutPreliminaryQuote.checkoutId, input.checkoutId),
            eq(checkoutPreliminaryQuote.executionId, input.executionId),
          ),
        )
        .limit(1)
    )[0];
    if (!row) return null;
    this.assertDigest(row.requestDigest, input.requestDigest);
    return preliminaryCheckoutQuoteResultSchema.parse(
      row.payload,
    ) as Pricing.CalculateCheckoutPreliminaryQuoteResult;
  }

  async savePreliminary(
    input: Attempt,
    payload: Pricing.CalculateCheckoutPreliminaryQuoteResult,
  ): Promise<Pricing.CalculateCheckoutPreliminaryQuoteResult> {
    await this.db
      .insert(checkoutPreliminaryQuote)
      .values({
        id: payload.preliminaryQuoteId,
        storeId: input.storeId,
        checkoutId: input.checkoutId,
        executionId: input.executionId,
        requestDigest: input.requestDigest,
        payload,
      })
      .onConflictDoNothing({
        target: [
          checkoutPreliminaryQuote.storeId,
          checkoutPreliminaryQuote.checkoutId,
          checkoutPreliminaryQuote.executionId,
        ],
      });
    const stored = await this.findPreliminary(input);
    if (!stored)
      throw new PricingCheckoutError(
        "PRICING_QUOTE_PERSISTENCE_FAILED",
        "Preliminary quote was not persisted",
        true,
      );
    return stored;
  }

  async findFinal(input: Attempt): Promise<Pricing.FinalizeCheckoutPricingQuoteResult | null> {
    const row = (
      await this.db
        .select()
        .from(checkoutFinalQuote)
        .where(
          and(
            eq(checkoutFinalQuote.storeId, input.storeId),
            eq(checkoutFinalQuote.checkoutId, input.checkoutId),
            eq(checkoutFinalQuote.executionId, input.executionId),
          ),
        )
        .limit(1)
    )[0];
    if (!row) return null;
    this.assertDigest(row.requestDigest, input.requestDigest);
    return finalCheckoutQuoteResultSchema.parse(
      row.payload,
    ) as Pricing.FinalizeCheckoutPricingQuoteResult;
  }

  async saveFinal(
    input: Attempt,
    preliminaryQuoteId: string,
    payload: Pricing.FinalizeCheckoutPricingQuoteResult,
  ): Promise<Pricing.FinalizeCheckoutPricingQuoteResult> {
    await this.db
      .insert(checkoutFinalQuote)
      .values({
        id: payload.quoteId,
        storeId: input.storeId,
        checkoutId: input.checkoutId,
        executionId: input.executionId,
        preliminaryQuoteId,
        requestDigest: input.requestDigest,
        payload,
      })
      .onConflictDoNothing({
        target: [
          checkoutFinalQuote.storeId,
          checkoutFinalQuote.checkoutId,
          checkoutFinalQuote.executionId,
        ],
      });
    const stored = await this.findFinal(input);
    if (!stored)
      throw new PricingCheckoutError(
        "PRICING_QUOTE_PERSISTENCE_FAILED",
        "Final quote was not persisted",
        true,
      );
    return stored;
  }

  async getPreliminaryById(
    storeId: string,
    id: string,
  ): Promise<Pricing.CalculateCheckoutPreliminaryQuoteResult | null> {
    const row = (
      await this.db
        .select()
        .from(checkoutPreliminaryQuote)
        .where(
          and(eq(checkoutPreliminaryQuote.storeId, storeId), eq(checkoutPreliminaryQuote.id, id)),
        )
        .limit(1)
    )[0];
    return row
      ? (preliminaryCheckoutQuoteResultSchema.parse(
          row.payload,
        ) as Pricing.CalculateCheckoutPreliminaryQuoteResult)
      : null;
  }

  async getFinalById(
    storeId: string,
    id: string,
  ): Promise<Pricing.FinalizeCheckoutPricingQuoteResult | null> {
    const row = (
      await this.db
        .select()
        .from(checkoutFinalQuote)
        .where(and(eq(checkoutFinalQuote.storeId, storeId), eq(checkoutFinalQuote.id, id)))
        .limit(1)
    )[0];
    return row
      ? (finalCheckoutQuoteResultSchema.parse(
          row.payload,
        ) as Pricing.FinalizeCheckoutPricingQuoteResult)
      : null;
  }

  private assertDigest(stored: string, requested: string): void {
    if (stored !== requested)
      throw new PricingCheckoutError(
        "PRICING_QUOTE_SNAPSHOT_CONFLICT",
        "Quote attempt was reused with a different request",
        false,
      );
  }
}
