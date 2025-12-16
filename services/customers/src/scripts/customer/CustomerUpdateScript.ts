import { BaseScript } from "../../kernel/BaseScript.js";
import type { CustomerUpdateParams, CustomerUpdateResult } from "./dto/index.js";

export class CustomerUpdateScript extends BaseScript<CustomerUpdateParams, CustomerUpdateResult> {
  protected async execute(params: CustomerUpdateParams): Promise<CustomerUpdateResult> {
    const { id, email } = params;

    // 1. Check if customer exists
    const existingCustomer = await this.repository.customer.findById(id);
    if (!existingCustomer) {
      return {
        customer: undefined,
        userErrors: [{ message: "Customer not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    // 2. Check if email is already taken by another customer
    if (email !== undefined && email !== existingCustomer.email) {
      const customerWithEmail = await this.repository.customer.findByEmail(email);
      if (customerWithEmail) {
        return {
          customer: undefined,
          userErrors: [{ message: "Email already exists", field: ["email"], code: "EMAIL_TAKEN" }],
        };
      }
    }

    // 3. Update customer
    if (email !== undefined) {
      await this.repository.customer.update(id, { email });
    } else {
      await this.repository.customer.touch(id);
    }

    // 4. Fetch updated customer
    const customer = await this.repository.customer.findById(id);

    this.logger.info({ customerId: id }, "Customer updated");

    return { customer: customer ?? undefined, userErrors: [] };
  }

  protected handleError(_error: unknown): CustomerUpdateResult {
    return {
      customer: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
