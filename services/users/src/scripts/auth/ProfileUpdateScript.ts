import { BaseScript } from "../../kernel/BaseScript.js";
import type { ProfileUpdateParams, ProfileUpdateResult } from "./dto/index.js";

export class ProfileUpdateScript extends BaseScript<
  ProfileUpdateParams,
  ProfileUpdateResult
> {
  protected async execute(
    params: ProfileUpdateParams
  ): Promise<ProfileUpdateResult> {
    const { customerId, firstName, lastName, phone, language, avatar } = params;

    // 1. Check if customer exists
    const existingCustomer = await this.repository.customer.findById(
      customerId
    );
    if (!existingCustomer) {
      return {
        customerId: undefined,
        userErrors: [
          {
            message: "Customer not found",
            code: "NOT_FOUND",
          },
        ],
      };
    }

    // 2. Update customer profile
    const updatedCustomer = await this.repository.customer.update(customerId, {
      firstName,
      lastName,
      phone,
      language,
      avatar,
    });

    this.logger.info({ customerId: updatedCustomer.id }, "Profile updated");

    return {
      customerId: updatedCustomer.id,
      userErrors: [],
    };
  }

  protected handleError(error: unknown): ProfileUpdateResult {
    const message = error instanceof Error ? error.message : "Internal error";
    return {
      customerId: undefined,
      userErrors: [{ message, code: "INTERNAL_ERROR" }],
    };
  }
}
