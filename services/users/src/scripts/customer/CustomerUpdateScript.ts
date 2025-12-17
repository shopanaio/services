import { BaseScript } from "../../kernel/BaseScript.js";
import type { CustomerUpdateParams, CustomerUpdateResult } from "./dto/index.js";

export class CustomerUpdateScript extends BaseScript<CustomerUpdateParams, CustomerUpdateResult> {
  protected async execute(params: CustomerUpdateParams): Promise<CustomerUpdateResult> {
    const { id, email, firstName, lastName, phone, language, isForbidden } = params;

    // 1. Check if customer exists
    const existingCustomer = await this.repository.customer.findById(id);
    if (!existingCustomer) {
      return {
        customerId: undefined,
        userErrors: [{
          message: "Customer not found",
          field: ["id"],
          code: "NOT_FOUND",
        }],
      };
    }

    // 2. If email is being changed, check if new email is available
    if (email && email !== existingCustomer.email) {
      const customerWithEmail = await this.repository.customer.findByEmail(email);
      if (customerWithEmail) {
        return {
          customerId: undefined,
          userErrors: [{
            message: `Email "${email}" is already in use`,
            field: ["email"],
            code: "EMAIL_ALREADY_EXISTS",
          }],
        };
      }
    }

    // 3. Update customer
    const updatedCustomer = await this.repository.customer.update(id, {
      email,
      firstName,
      lastName,
      phone,
      language,
      isForbidden,
    });

    this.logger.info({ customerId: updatedCustomer.id }, "Customer updated");

    return {
      customerId: updatedCustomer.id,
      userErrors: [],
    };
  }

  protected handleError(error: unknown): CustomerUpdateResult {
    const message = error instanceof Error ? error.message : "Internal error";
    return {
      customerId: undefined,
      userErrors: [{ message, code: "INTERNAL_ERROR" }],
    };
  }
}
