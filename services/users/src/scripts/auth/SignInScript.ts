import { BaseScript } from "../../kernel/BaseScript.js";
import type { SignInParams, SignInResult, AuthTokenData } from "./dto/index.js";

const DEFAULT_EXPIRES_IN = 7200; // 2 hours

export class SignInScript extends BaseScript<SignInParams, SignInResult> {
  protected async execute(params: SignInParams): Promise<SignInResult> {
    const { email, password } = params;

    // 1. Find customer by email
    const customer = await this.repository.customer.findByEmail(email);
    if (!customer) {
      return {
        customerId: undefined,
        token: undefined,
        userErrors: [{
          message: "Invalid email or password",
          code: "INVALID_CREDENTIALS",
        }],
      };
    }

    // 2. Check if account is forbidden
    if (customer.isForbidden) {
      return {
        customerId: undefined,
        token: undefined,
        userErrors: [{
          message: "Account is suspended",
          code: "ACCOUNT_FORBIDDEN",
        }],
      };
    }

    // 3. Check if account is deleted
    if (customer.isDeleted) {
      return {
        customerId: undefined,
        token: undefined,
        userErrors: [{
          message: "Account not found",
          code: "ACCOUNT_DELETED",
        }],
      };
    }

    // 4. Authenticate
    let accessToken: string;
    try {
      accessToken = await this.repository.customer.signIn(email, password);
    } catch {
      return {
        customerId: undefined,
        token: undefined,
        userErrors: [{
          message: "Invalid email or password",
          code: "INVALID_CREDENTIALS",
        }],
      };
    }

    const token: AuthTokenData = {
      accessToken,
      expiresIn: DEFAULT_EXPIRES_IN,
      refreshToken: null,
    };

    this.logger.info({ customerId: customer.id }, "Customer signed in");

    return {
      customerId: customer.id,
      token,
      userErrors: [],
    };
  }

  protected handleError(error: unknown): SignInResult {
    const message = error instanceof Error ? error.message : "Internal error";
    return {
      customerId: undefined,
      token: undefined,
      userErrors: [{ message, code: "INTERNAL_ERROR" }],
    };
  }
}
