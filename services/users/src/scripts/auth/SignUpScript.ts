import { BaseScript } from "../../kernel/BaseScript.js";
import type { SignUpParams, SignUpResult, AuthTokenData } from "./dto/index.js";

const DEFAULT_EXPIRES_IN = 7200; // 2 hours

export class SignUpScript extends BaseScript<SignUpParams, SignUpResult> {
  protected async execute(params: SignUpParams): Promise<SignUpResult> {
    const { email, password } = params;

    // 1. Check if customer with this email already exists
    const existingCustomer = await this.repository.customer.findByEmail(email);
    if (existingCustomer) {
      return {
        customerId: undefined,
        token: undefined,
        userErrors: [{
          message: "An account with this email already exists",
          field: ["email"],
          code: "EMAIL_ALREADY_EXISTS",
        }],
      };
    }

    // 2. Create customer
    const customer = await this.repository.customer.create({
      email,
      password,
    });

    // 3. Auto sign-in after registration
    let token: AuthTokenData | undefined;
    try {
      const accessToken = await this.repository.customer.signIn(email, password);
      token = {
        accessToken,
        expiresIn: DEFAULT_EXPIRES_IN,
        refreshToken: null, // Casdoor doesn't return refresh token on password login
      };
    } catch {
      // Sign-in failed, but registration succeeded
      this.logger.warn({ customerId: customer.id }, "Auto sign-in after signup failed");
    }

    this.logger.info({ customerId: customer.id, email }, "Customer signed up");

    return {
      customerId: customer.id,
      token,
      userErrors: [],
    };
  }

  protected handleError(error: unknown): SignUpResult {
    const message = error instanceof Error ? error.message : "Internal error";
    return {
      customerId: undefined,
      token: undefined,
      userErrors: [{ message, code: "INTERNAL_ERROR" }],
    };
  }
}
