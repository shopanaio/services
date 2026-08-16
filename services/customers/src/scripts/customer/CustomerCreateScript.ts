import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type {
  CustomerCreateParams,
  CustomerCreateResult,
} from "./dto/index.js";

export class CustomerCreateScript extends BaseScript<
  CustomerCreateParams,
  CustomerCreateResult
> {
  @Transactional()
  protected async execute(
    params: CustomerCreateParams
  ): Promise<CustomerCreateResult> {
    const errors = validateCreate(params);

    if (params.email) {
      const existing = await this.repository.customer.findByEmail(params.email);
      if (existing) {
        errors.push({
          message: "A customer with this email already exists",
          code: "DUPLICATE_EMAIL",
          field: ["email"],
        });
      }
    }

    if (errors.length > 0) return { customer: undefined, userErrors: errors };

    try {
      const customer = await this.repository.customer.create(params);
      await this.invalidateDynamicSegments(
        customer.id,
        ["customer.any"],
        "customerCreated",
      );
      this.logger.info({ customerId: customer.id }, "Customer created");
      return {
        customer: { id: customer.id, revision: customer.revision },
        userErrors: [],
      };
    } catch (error) {
      if (isUniqueViolation(error, "customer_store_email_unique")) {
        return {
          customer: undefined,
          userErrors: [
            {
              message: "A customer with this email already exists",
              code: "DUPLICATE_EMAIL",
              field: ["email"],
            },
          ],
        };
      }
      throw error;
    }
  }

  protected handleError(_error: unknown): CustomerCreateResult {
    return {
      customer: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function validateCreate(params: CustomerCreateParams) {
  const errors: Array<{ message: string; code: string; field: string[] }> = [];

  if (
    params.phoneE164 !== undefined &&
    params.phoneE164 !== null &&
    !/^\+[1-9][0-9]{6,14}$/.test(params.phoneE164)
  ) {
    errors.push({
      message: "Phone number must use E.164 format",
      code: "INVALID_PHONE",
      field: ["phoneE164"],
    });
  }

  if (
    typeof params.moderationNote === "string" &&
    params.moderationNote.trim().length === 0
  ) {
    errors.push({
      message: "Moderation note cannot be empty",
      code: "INVALID_MODERATION_NOTE",
      field: ["moderationNote"],
    });
  }

  return errors;
}
