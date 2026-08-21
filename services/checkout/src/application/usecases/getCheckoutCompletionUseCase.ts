import type { Checkout } from "@shopana/broker-types";
import type { CheckoutInternalSnapshotPort } from "@src/application/mutations/index.js";

export class GetCheckoutCompletionUseCase {
  constructor(private readonly snapshots: CheckoutInternalSnapshotPort) {}

  async execute(
    input: Checkout.GetCheckoutCompletionParams,
  ): Promise<Checkout.GetCheckoutCompletionResult> {
    const checkout = await this.snapshots.load(input);
    if (!checkout) return null;

    const finalPricing = checkout.result.finalPricing;
    const validation = checkout.result.validation;
    if (finalPricing.status !== "SUCCESS" || validation.status !== "SUCCESS") {
      throw new Error("Committed checkout contains an incomplete pipeline result");
    }

    return {
      checkoutId: checkout.checkoutId,
      storeId: checkout.storeId,
      valid: validation.data.valid,
      quoteId: finalPricing.data.quoteId,
      usageRequirements: finalPricing.data.usageRequirements,
    };
  }
}
