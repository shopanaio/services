import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import {
  normalizeBirthdayMonthDay,
  normalizePreferredLocale,
} from "../../segments/normalization.js";
import type {
  CustomerCreateParams,
  CustomerCreateResult,
} from "./dto/index.js";

const STRING_LIMITS = {
  email: 320,
  prefix: 32,
  firstName: 128,
  middleName: 128,
  lastName: 128,
  suffix: 32,
  preferredLocale: 35,
  gender: 32,
  companyName: 255,
  jobTitle: 255,
} as const satisfies Partial<Record<keyof CustomerCreateParams, number>>;

const MODERATION_NOTE_LIMIT = 10_000;

export class CustomerCreateScript extends BaseScript<
  CustomerCreateParams,
  CustomerCreateResult
> {
  @Transactional()
  protected async execute(
    params: CustomerCreateParams
  ): Promise<CustomerCreateResult> {
    const normalizedParams = normalizeCreateParams(params);
    const errors = validateCreate(normalizedParams);

    if (normalizedParams.email) {
      const existing = await this.repository.customer.findByEmail(
        normalizedParams.email
      );
      if (existing) {
        errors.push({
          message: "A customer with this email already exists",
          code: "DUPLICATE_EMAIL",
          field: ["email"],
        });
      }
    }

    if (errors.length > 0) return { customer: undefined, userErrors: errors };

    const customer = await this.repository.customer.createIfAbsent(
      normalizedParams
    );
    if (!customer) {
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
  }

  protected handleError(_error: unknown): CustomerCreateResult {
    return {
      customer: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function normalizeCreateParams(
  params: CustomerCreateParams
): CustomerCreateParams {
  if (typeof params.email !== "string") return params;
  return {
    ...params,
    email: params.email.trim().toLowerCase() || null,
  };
}

function validateCreate(params: CustomerCreateParams) {
  const errors: Array<{ message: string; code: string; field: string[] }> = [];

  for (const [field, limit] of Object.entries(STRING_LIMITS) as Array<
    [keyof typeof STRING_LIMITS, number]
  >) {
    const value = params[field];
    if (typeof value === "string" && [...value].length > limit) {
      errors.push({
        message: `Value must not exceed ${limit} characters`,
        code: "INVALID_VALUE",
        field: [field],
      });
    }
  }

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
  } else if (
    typeof params.moderationNote === "string" &&
    [...params.moderationNote].length > MODERATION_NOTE_LIMIT
  ) {
    errors.push({
      message: `Moderation note must not exceed ${MODERATION_NOTE_LIMIT} characters`,
      code: "INVALID_MODERATION_NOTE",
      field: ["moderationNote"],
    });
  }

  if (params.dateOfBirth && !isValidDateOfBirth(params.dateOfBirth)) {
    errors.push({
      message: "Date of birth must be a valid non-future YYYY-MM-DD date",
      code: "INVALID_DATE_OF_BIRTH",
      field: ["dateOfBirth"],
    });
  }

  if (params.preferredLocale && !isValidPreferredLocale(params.preferredLocale)) {
    errors.push({
      message: "Preferred locale must be a BCP 47 language tag",
      code: "INVALID_LOCALE",
      field: ["preferredLocale"],
    });
  }

  return errors;
}

function isValidDateOfBirth(value: string): boolean {
  try {
    normalizeBirthdayMonthDay(value);
    return value <= new Date().toISOString().slice(0, 10);
  } catch {
    return false;
  }
}

function isValidPreferredLocale(value: string): boolean {
  try {
    normalizePreferredLocale(value);
    return true;
  } catch {
    return false;
  }
}
