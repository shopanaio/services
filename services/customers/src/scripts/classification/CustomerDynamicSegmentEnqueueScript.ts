import type { SegmentDependency } from "@shopana/customer-segment-dsl";
import { BaseScript, Transactional } from "../../kernel/BaseScript.js";

export interface CustomerDynamicSegmentEnqueueParams {
  readonly customerId: string;
  readonly dependencies: readonly SegmentDependency[];
  readonly sourceEventId: string;
  readonly effectiveAt: string;
}

export class CustomerDynamicSegmentEnqueueScript extends BaseScript<
  CustomerDynamicSegmentEnqueueParams,
  number
> {
  @Transactional()
  protected execute(params: CustomerDynamicSegmentEnqueueParams): Promise<number> {
    return this.repository.segmentMaterialization.enqueueCustomer(
      params.customerId,
      new Set(params.dependencies),
      params.sourceEventId,
      params.effectiveAt,
    );
  }

  protected handleError(error: unknown): number {
    throw error;
  }
}
