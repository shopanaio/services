import { BaseScript, Transactional } from "../../kernel/BaseScript.js";

export interface CustomerDynamicSegmentCleanupParams {
  readonly customerId: string;
}

export class CustomerDynamicSegmentCleanupScript extends BaseScript<
  CustomerDynamicSegmentCleanupParams,
  void
> {
  @Transactional()
  protected async execute(params: CustomerDynamicSegmentCleanupParams): Promise<void> {
    await this.repository.segmentMaterialization.cleanupCustomer(params.customerId);
  }

  protected handleError(error: unknown): void {
    throw error;
  }
}

export interface CustomerDynamicSegmentMergeParams {
  readonly sourceCustomerId: string;
  readonly targetCustomerId: string;
  readonly sourceEventId: string;
  readonly effectiveAt: string;
}

export class CustomerDynamicSegmentMergeScript extends BaseScript<
  CustomerDynamicSegmentMergeParams,
  number
> {
  @Transactional()
  protected async execute(params: CustomerDynamicSegmentMergeParams): Promise<number> {
    await this.repository.segmentMaterialization.cleanupCustomer(
      params.sourceCustomerId,
    );
    return this.repository.segmentMaterialization.enqueueCustomer(
      params.targetCustomerId,
      new Set(["customer.any"]),
      params.sourceEventId,
      params.effectiveAt,
    );
  }

  protected handleError(error: unknown): number {
    throw error;
  }
}
