import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";

export interface CustomerConsentDeleteParams {
  id: string;
}

export interface CustomerConsentDeleteResult {
  deletedConsentId?: string;
  customerId?: string;
  userErrors: UserError[];
}

export class CustomerConsentDeleteScript extends BaseScript<
  CustomerConsentDeleteParams,
  CustomerConsentDeleteResult
> {
  @Transactional()
  protected async execute(
    params: CustomerConsentDeleteParams
  ): Promise<CustomerConsentDeleteResult> {
    const consent = await this.repository.consent.findById(params.id);
    if (!consent) {
      return notFound();
    }

    const deleted = await this.repository.consent.delete(params.id);
    if (!deleted) {
      return notFound();
    }

    this.logger.info(
      { consentId: deleted.id, customerId: deleted.customerId },
      "Customer consent deleted"
    );
    return {
      deletedConsentId: deleted.id,
      customerId: deleted.customerId,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): CustomerConsentDeleteResult {
    return {
      deletedConsentId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function notFound(): CustomerConsentDeleteResult {
  return {
    deletedConsentId: undefined,
    userErrors: [
      { message: "Customer consent not found", field: ["id"], code: "NOT_FOUND" },
    ],
  };
}
