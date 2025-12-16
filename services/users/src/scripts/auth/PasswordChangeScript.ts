import { BaseScript } from "../../kernel/BaseScript.js";
import type { PasswordChangeParams, PasswordChangeResult } from "./dto/index.js";

export class PasswordChangeScript extends BaseScript<PasswordChangeParams, PasswordChangeResult> {
  protected async execute(params: PasswordChangeParams): Promise<PasswordChangeResult> {
    const { customerId, currentPassword, newPassword } = params;

    // 1. Find customer
    const customer = await this.repository.customer.findById(customerId);
    if (!customer) {
      return {
        success: false,
        userErrors: [{
          message: "Customer not found",
          code: "NOT_FOUND",
        }],
      };
    }

    // 2. Change password
    try {
      const success = await this.repository.customer.setPassword(
        customerId,
        currentPassword,
        newPassword
      );

      if (!success) {
        return {
          success: false,
          userErrors: [{
            message: "Current password is incorrect",
            field: ["currentPassword"],
            code: "INVALID_PASSWORD",
          }],
        };
      }

      this.logger.info({ customerId }, "Password changed");

      return {
        success: true,
        userErrors: [],
      };
    } catch {
      return {
        success: false,
        userErrors: [{
          message: "Current password is incorrect",
          field: ["currentPassword"],
          code: "INVALID_PASSWORD",
        }],
      };
    }
  }

  protected handleError(error: unknown): PasswordChangeResult {
    const message = error instanceof Error ? error.message : "Internal error";
    return {
      success: false,
      userErrors: [{ message, code: "INTERNAL_ERROR" }],
    };
  }
}
