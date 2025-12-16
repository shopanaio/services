import { BaseScript } from "../../kernel/BaseScript.js";
import type { CustomerCreateParams, CustomerCreateResult } from "./dto/index.js";

export class CustomerCreateScript extends BaseScript<CustomerCreateParams, CustomerCreateResult> {
  protected async execute(params: CustomerCreateParams): Promise<CustomerCreateResult> {
    const { email } = params;

    // Check if email is already taken
    const existingCustomer = await this.repository.customer.findByEmail(email);
    if (existingCustomer) {
      return {
        customer: undefined,
        userErrors: [{ message: "Email already exists", field: ["email"], code: "EMAIL_TAKEN" }],
      };
    }

    // Create customer
    const customer = await this.repository.customer.create({ email });

    this.logger.info({ customerId: customer.id }, "Customer created");

    return {
      customer,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): CustomerCreateResult {
    return {
      customer: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
