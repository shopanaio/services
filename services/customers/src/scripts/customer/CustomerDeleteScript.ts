import { BaseScript } from "../../kernel/BaseScript.js";
import type { CustomerDeleteParams, CustomerDeleteResult } from "./dto/index.js";

export class CustomerDeleteScript extends BaseScript<CustomerDeleteParams, CustomerDeleteResult> {
  protected async execute(params: CustomerDeleteParams): Promise<CustomerDeleteResult> {
    const { id, permanent = false } = params;

    // 1. Check if customer exists
    const existingCustomer = await this.repository.customer.findById(id);
    if (!existingCustomer) {
      return {
        deletedCustomerId: undefined,
        userErrors: [{ message: "Customer not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    // 2. Delete customer (soft or hard)
    let deleted: boolean;
    if (permanent) {
      deleted = await this.repository.customer.hardDelete(id);
    } else {
      deleted = await this.repository.customer.softDelete(id);
    }

    if (!deleted) {
      return {
        deletedCustomerId: undefined,
        userErrors: [{ message: "Failed to delete customer", code: "DELETE_FAILED" }],
      };
    }

    this.logger.info({ customerId: id, permanent }, "Customer deleted");

    return { deletedCustomerId: id, userErrors: [] };
  }

  protected handleError(_error: unknown): CustomerDeleteResult {
    return {
      deletedCustomerId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
