import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";

export interface CustomerTaxIdentifierDeleteParams {
  id: string;
}

export interface CustomerTaxIdentifierDeleteResult {
  deletedTaxIdentifierId?: string;
  customerId?: string;
  userErrors: UserError[];
}

export class CustomerTaxIdentifierDeleteScript extends BaseScript<
  CustomerTaxIdentifierDeleteParams,
  CustomerTaxIdentifierDeleteResult
> {
  @Transactional()
  protected async execute(
    params: CustomerTaxIdentifierDeleteParams
  ): Promise<CustomerTaxIdentifierDeleteResult> {
    const taxIdentifier = await this.repository.taxIdentifier.findById(
      params.id
    );
    if (!taxIdentifier) {
      return notFound();
    }

    const deleted = await this.repository.taxIdentifier.softDelete(params.id);
    if (!deleted) {
      return notFound();
    }

    this.logger.info(
      { taxIdentifierId: params.id, customerId: taxIdentifier.customerId },
      "Customer tax identifier deleted"
    );
    return {
      deletedTaxIdentifierId: params.id,
      customerId: taxIdentifier.customerId,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): CustomerTaxIdentifierDeleteResult {
    return {
      deletedTaxIdentifierId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function notFound(): CustomerTaxIdentifierDeleteResult {
  return {
    deletedTaxIdentifierId: undefined,
    userErrors: [
      {
        message: "Customer tax identifier not found",
        field: ["id"],
        code: "NOT_FOUND",
      },
    ],
  };
}
