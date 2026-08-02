import type { CheckoutDto } from "@shopana/checkout-sdk";
import type { CheckoutMutationSnapshotPort } from "@src/application/mutations/index.js";
import { committedCheckoutToDto } from "@src/application/mutations/index.js";

export interface GetCheckoutDtoByIdInput {
  checkoutId: string;
  storeId: string;
}

export class GetCheckoutDtoByIdUseCase {
  constructor(private readonly snapshots: CheckoutMutationSnapshotPort) {}

  async execute(input: GetCheckoutDtoByIdInput): Promise<CheckoutDto | null> {
    const checkout = await this.snapshots.load(input);
    return checkout ? committedCheckoutToDto(checkout) : null;
  }
}
