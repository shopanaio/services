import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";

export interface CustomerTaxExemptionDeleteParams {
  id: string;
}

export interface CustomerTaxExemptionDeleteResult {
  deletedTaxExemptionId?: string;
  customerId?: string;
  userErrors: UserError[];
}

export class CustomerTaxExemptionDeleteScript extends BaseScript<
  CustomerTaxExemptionDeleteParams,
  CustomerTaxExemptionDeleteResult
> {
  @Transactional()
  protected async execute(
    params: CustomerTaxExemptionDeleteParams
  ): Promise<CustomerTaxExemptionDeleteResult> {
    const taxExemption = await this.repository.taxExemption.findById(params.id);
    if (!taxExemption) {
      return notFound();
    }

    const deleted = await this.repository.taxExemption.softDelete(params.id);
    if (!deleted) {
      return notFound();
    }

    this.logger.info(
      { taxExemptionId: params.id, customerId: taxExemption.customerId },
      "Customer tax exemption deleted"
    );
    return {
      deletedTaxExemptionId: params.id,
      customerId: taxExemption.customerId,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): CustomerTaxExemptionDeleteResult {
    return {
      deletedTaxExemptionId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function notFound(): CustomerTaxExemptionDeleteResult {
  return {
    deletedTaxExemptionId: undefined,
    userErrors: [
      {
        message: "Customer tax exemption not found",
        field: ["id"],
        code: "NOT_FOUND",
      },
    ],
  };
}
