import { BaseScript } from "../../kernel/BaseScript.js";
import type { PasswordResetRequestParams, PasswordResetRequestResult } from "./dto/index.js";

export class PasswordResetRequestScript extends BaseScript<PasswordResetRequestParams, PasswordResetRequestResult> {
  protected async execute(params: PasswordResetRequestParams): Promise<PasswordResetRequestResult> {
    const { email } = params;

    // For security, always return success even if email doesn't exist
    // This prevents email enumeration attacks

    try {
      await this.repository.customer.requestPasswordRecovery(email);
      this.logger.info({ email }, "Password reset email sent");
    } catch (error) {
      // Log but don't expose to user
      this.logger.warn({ email, error }, "Failed to send password reset email");
    }

    return {
      success: true,
      userErrors: [],
    };
  }

  protected handleError(error: unknown): PasswordResetRequestResult {
    // For security, don't reveal errors to user
    this.logger.error({ error }, "Password reset request failed");
    return {
      success: true, // Always return success
      userErrors: [],
    };
  }
}
