import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";

export interface CustomerSegmentDeleteParams {
  id: string;
  expectedRevision?: number;
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
    if (params.expectedRevision !== undefined && segment.revision !== params.expectedRevision) {
      return revisionConflict();
    }

    const deleted = await this.repository.segment.softDelete(params.id, params.expectedRevision);
    if (!deleted) {
      return revisionConflict();
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

function revisionConflict(): CustomerSegmentDeleteResult {
  return {
    deletedSegmentId: undefined,
    userErrors: [
      {
        message: "Customer segment was modified by another user",
        field: ["expectedRevision"],
        code: "REVISION_CONFLICT",
      },
    ],
  };
}
