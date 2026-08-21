import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";

export interface CustomerSegmentDeleteParams {
  id: string;
}

export interface CustomerSegmentDeleteResult {
  deletedSegmentId?: string;
  userErrors: UserError[];
}

export class CustomerSegmentDeleteScript extends BaseScript<
  CustomerSegmentDeleteParams,
  CustomerSegmentDeleteResult
> {
  @Transactional()
  protected async execute(
    params: CustomerSegmentDeleteParams,
  ): Promise<CustomerSegmentDeleteResult> {
    const segment = await this.repository.segment.findById(params.id);
    if (!segment) {
      return notFound();
    }
    const deleted = await this.repository.segment.softDelete(params.id);
    if (!deleted) {
      return notFound();
    }
    await this.repository.segment.deleteMembershipsBySegmentId(params.id);

    this.logger.info(
      { segmentId: params.id, revision: segment.revision },
      "Customer segment deleted",
    );
    return { deletedSegmentId: params.id, userErrors: [] };
  }

  protected handleError(_error: unknown): CustomerSegmentDeleteResult {
    return {
      deletedSegmentId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function notFound(): CustomerSegmentDeleteResult {
  return {
    deletedSegmentId: undefined,
    userErrors: [{ message: "Customer segment not found", field: ["id"], code: "NOT_FOUND" }],
  };
}
