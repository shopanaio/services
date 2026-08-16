import { BaseScript, Transactional } from "../../kernel/BaseScript.js";

export interface CustomerDynamicSegmentInvalidateParams {
  customerIds: readonly string[];
}

export class CustomerDynamicSegmentInvalidateScript extends BaseScript<
  CustomerDynamicSegmentInvalidateParams,
  number
> {
  @Transactional()
  protected execute(params: CustomerDynamicSegmentInvalidateParams): Promise<number> {
    return this.repository.segment.invalidateRuleMemberships(params.customerIds);
  }

  protected handleError(error: unknown): number {
    throw error;
  }
}
