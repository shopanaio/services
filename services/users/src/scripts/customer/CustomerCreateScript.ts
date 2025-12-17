import { BaseScript } from "../../kernel/BaseScript.js";
import type { CustomerCreateParams, CustomerCreateResult } from "./dto/index.js";

export class CustomerCreateScript extends BaseScript<CustomerCreateParams, CustomerCreateResult> {
  protected async execute(params: CustomerCreateParams): Promise<CustomerCreateResult> {
    const { email, password, firstName, lastName, phone, language } = params;

    // 1. Check if customer with this email already exists
    const existingCustomer = await this.repository.customer.findByEmail(email);
    if (existingCustomer) {
      return {
        customerId: undefined,
        userErrors: [{
          message: `Customer with email "${email}" already exists`,
          field: ["email"],
          code: "EMAIL_ALREADY_EXISTS",
        }],
      };
    }

    // 2. Create customer
    const customer = await this.repository.customer.create({
      email,
      password,
      firstName,
      lastName,
      phone,
      language,
    });

    this.logger.info({ customerId: customer.id, email }, "Customer created");

    return {
      customerId: customer.id,
      userErrors: [],
    };
  }

  protected handleError(error: unknown): CustomerCreateResult {
    const message = error instanceof Error ? error.message : "Internal error";
    return {
      customerId: undefined,
      userErrors: [{ message, code: "INTERNAL_ERROR" }],
    };
  }
}
