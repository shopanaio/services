import { BaseScript } from "../../kernel/BaseScript.js";
import type { EmailVerifyParams, EmailVerifyResult } from "./dto/index.js";

export class EmailVerifyScript extends BaseScript<EmailVerifyParams, EmailVerifyResult> {
  protected async execute(params: EmailVerifyParams): Promise<EmailVerifyResult> {
    const { email, code } = params;

    try {
      await this.repository.customer.verifyEmail(email, code);

      // Find customer to return customerId
      const customer = await this.repository.customer.findByEmail(email);

      this.logger.info({ email }, "Email verified");

      return {
        success: true,
        customerId: customer?.id,
        userErrors: [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to verify email";
      return {
        success: false,
        customerId: undefined,
        userErrors: [{
          message,
          code: "VERIFICATION_FAILED",
        }],
      };
    }
  }

  protected handleError(error: unknown): EmailVerifyResult {
    const message = error instanceof Error ? error.message : "Internal error";
    return {
      success: false,
      customerId: undefined,
      userErrors: [{ message, code: "INTERNAL_ERROR" }],
    };
  }
}
