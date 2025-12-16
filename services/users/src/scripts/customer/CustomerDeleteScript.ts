import { BaseScript } from "../../kernel/BaseScript.js";
import type { CustomerDeleteParams, CustomerDeleteResult } from "./dto/index.js";

export class CustomerDeleteScript extends BaseScript<CustomerDeleteParams, CustomerDeleteResult> {
  protected async execute(params: CustomerDeleteParams): Promise<CustomerDeleteResult> {
    const { id, permanent } = params;

    // 1. Check if customer exists
    const existingCustomer = await this.repository.customer.findById(id);
    if (!existingCustomer) {
      return {
        deletedCustomerId: undefined,
        userErrors: [{
          message: "Customer not found",
          field: ["id"],
          code: "NOT_FOUND",
        }],
      };
    }

    // 2. Delete customer
    await this.repository.customer.delete(id, permanent);

    this.logger.info({ customerId: id, permanent }, "Customer deleted");

    return {
      deletedCustomerId: id,
      userErrors: [],
    };
  }

  protected handleError(error: unknown): CustomerDeleteResult {
    const message = error instanceof Error ? error.message : "Internal error";
    return {
      deletedCustomerId: undefined,
      userErrors: [{ message, code: "INTERNAL_ERROR" }],
    };
  }
}
