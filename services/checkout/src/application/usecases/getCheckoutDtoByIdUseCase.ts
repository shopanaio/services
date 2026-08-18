import type { CheckoutDto } from "@shopana/checkout-sdk";
import type { CheckoutInternalSnapshotPort } from "@src/application/mutations/index.js";
import { committedCheckoutToDto } from "@src/application/mutations/index.js";

export interface GetCheckoutDtoByIdInput {
  checkoutId: string;
  storeId: string;
}

export class GetCheckoutDtoByIdUseCase {
  constructor(private readonly snapshots: CheckoutInternalSnapshotPort) {}

  async execute(input: GetCheckoutDtoByIdInput): Promise<CheckoutDto | null> {
    const checkout = await this.snapshots.load(input);
    return checkout ? committedCheckoutToDto(checkout) : null;
  }
}
