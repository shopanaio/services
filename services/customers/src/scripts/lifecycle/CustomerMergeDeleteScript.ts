import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";

export interface CustomerMergeDeleteParams {
  id: string;
}

export interface CustomerMergeDeleteResult {
  deletedMergeId?: string;
  userErrors: UserError[];
}

export class CustomerMergeDeleteScript extends BaseScript<
  CustomerMergeDeleteParams,
  CustomerMergeDeleteResult
> {
  @Transactional()
  protected async execute(
    params: CustomerMergeDeleteParams
  ): Promise<CustomerMergeDeleteResult> {
    const merge = await this.repository.lifecycle.findMergeById(params.id);
    if (!merge) {
      return notFound();
    }
    if (merge.status !== "REQUESTED") {
      return invalidState();
    }

    const deleted = await this.repository.lifecycle.deleteMerge(params.id);
    if (!deleted) {
      return invalidState();
    }

    this.logger.info({ mergeId: params.id }, "Customer merge request deleted");
    return { deletedMergeId: params.id, userErrors: [] };
  }

  protected handleError(_error: unknown): CustomerMergeDeleteResult {
    return {
      deletedMergeId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function notFound(): CustomerMergeDeleteResult {
  return {
    deletedMergeId: undefined,
    userErrors: [
      { message: "Customer merge not found", field: ["id"], code: "NOT_FOUND" },
    ],
  };
}

function invalidState(): CustomerMergeDeleteResult {
  return {
    deletedMergeId: undefined,
    userErrors: [
      {
        message: "Only a requested customer merge can be deleted",
        field: ["id"],
        code: "INVALID_STATE",
      },
    ],
  };
}
