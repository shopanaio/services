import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";

export interface CustomerDataRequestDeleteParams {
  id: string;
}

export interface CustomerDataRequestDeleteResult {
  deletedDataRequestId?: string;
  userErrors: UserError[];
}

export class CustomerDataRequestDeleteScript extends BaseScript<
  CustomerDataRequestDeleteParams,
  CustomerDataRequestDeleteResult
> {
  @Transactional()
  protected async execute(
    params: CustomerDataRequestDeleteParams,
  ): Promise<CustomerDataRequestDeleteResult> {
    const dataRequest = await this.repository.lifecycle.findDataRequestById(params.id);
    if (!dataRequest) {
      return notFound();
    }
    if (dataRequest.status !== "PENDING") {
      return invalidState();
    }

    const deleted = await this.repository.lifecycle.deleteDataRequest(params.id);
    if (!deleted) {
      return invalidState();
    }

    this.logger.info({ dataRequestId: params.id }, "Customer data request deleted");
    return { deletedDataRequestId: params.id, userErrors: [] };
  }

  protected handleError(_error: unknown): CustomerDataRequestDeleteResult {
    return {
      deletedDataRequestId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function notFound(): CustomerDataRequestDeleteResult {
  return {
    deletedDataRequestId: undefined,
    userErrors: [
      {
        message: "Customer data request not found",
        field: ["id"],
        code: "NOT_FOUND",
      },
    ],
  };
}

function invalidState(): CustomerDataRequestDeleteResult {
  return {
    deletedDataRequestId: undefined,
    userErrors: [
      {
        message: "Only a pending customer data request can be deleted",
        field: ["id"],
        code: "INVALID_STATE",
      },
    ],
  };
}
