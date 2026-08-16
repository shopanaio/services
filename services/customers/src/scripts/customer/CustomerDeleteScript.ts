import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type {
  CustomerDeleteParams,
  CustomerDeleteResult,
} from "./dto/index.js";

export class CustomerDeleteScript extends BaseScript<
  CustomerDeleteParams,
  CustomerDeleteResult
> {
  @Transactional()
  protected async execute(
    params: CustomerDeleteParams
  ): Promise<CustomerDeleteResult> {
    const customer = await this.repository.customer.findById(params.id);
    if (!customer) {
      return {
        deletedCustomerId: undefined,
        userErrors: [
          { message: "Customer not found", field: ["id"], code: "NOT_FOUND" },
        ],
      };
    }

    if (
      params.expectedRevision !== undefined &&
      customer.revision !== params.expectedRevision
    ) {
      return revisionConflict();
    }

    await this.repository.segmentMaterialization.cleanupCustomer(params.id);
    const deleted = await this.repository.customer.softDelete(
      params.id,
      params.expectedRevision
    );
    if (!deleted || !deleted.deletedAt) return revisionConflict();

    this.logger.info(
      { customerId: deleted.id, revision: deleted.revision },
      "Customer deleted"
    );

    return {
      deletedCustomerId: deleted.id,
      revision: deleted.revision,
      deletedAt: deleted.deletedAt,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): CustomerDeleteResult {
    return {
      deletedCustomerId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function revisionConflict(): CustomerDeleteResult {
  return {
    deletedCustomerId: undefined,
    userErrors: [
      {
        message: "Customer was modified by another user",
        field: ["expectedRevision"],
        code: "REVISION_CONFLICT",
      },
    ],
  };
}
