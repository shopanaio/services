import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import {
  CustomerConsentAlreadyExistsError,
} from "../../repositories/consent/CustomerConsentRepository.js";
import type { CustomerConsent } from "../../repositories/models/index.js";

type CustomerConsentAdminState = Exclude<
  CustomerConsent["state"],
  "INVALID" | "REDACTED"
>;

export interface CustomerConsentCreateParams {
  customerId: string;
  channel: CustomerConsent["channel"];
  state: CustomerConsentAdminState;
  optInLevel?: CustomerConsent["optInLevel"] | null;
  contactPoint: string;
  sourceLocationId?: string | null;
  evidence?: Record<string, unknown> | null;
}

export interface CustomerConsentCreateResult {
  consent?: { id: string };
  event?: { id: string };
  userErrors: UserError[];
}

export class CustomerConsentCreateScript extends BaseScript<
  CustomerConsentCreateParams,
  CustomerConsentCreateResult
> {
  @Transactional()
  protected async execute(
    params: CustomerConsentCreateParams
  ): Promise<CustomerConsentCreateResult> {
    const errors: UserError[] = [];
    if (params.contactPoint.trim().length === 0) {
      errors.push({
        message: "Contact point cannot be empty",
        code: "INVALID_CONTACT_POINT",
        field: ["contactPoint"],
      });
    }
    if (!(await this.repository.customer.exists(params.customerId))) {
      errors.push({
        message: "Customer not found",
        code: "NOT_FOUND",
        field: ["customerId"],
      });
    }
    if (errors.length > 0) {
      return { consent: undefined, event: undefined, userErrors: errors };
    }

    try {
      const result = await this.repository.consent.set({
        customerId: params.customerId,
        channel: params.channel,
        state: params.state,
        optInLevel: params.optInLevel ?? undefined,
        contactPoint: params.contactPoint,
        source: "admin",
        sourceLocationId: params.sourceLocationId ?? null,
        actorType: this.context.hasUser ? "user" : "service",
        actorId: this.context.hasUser ? this.currentUser.id : null,
        requestId: this.context.requestId,
        idempotencyKey: `${this.context.requestId}:customerConsentCreate`,
        evidence: params.evidence ?? {},
        createOnly: true,
      });
      this.logger.info(
        {
          consentId: result.consent.id,
          eventId: result.event.id,
          customerId: params.customerId,
        },
        "Customer consent created"
      );
      return {
        consent: { id: result.consent.id },
        event: { id: result.event.id },
        userErrors: [],
      };
    } catch (error) {
      if (
        error instanceof CustomerConsentAlreadyExistsError ||
        isUniqueViolation(error, "customer_consent_customer_channel_unique")
      ) {
        return duplicateConsentResult();
      }
      throw error;
    }
  }

  protected handleError(error: unknown): CustomerConsentCreateResult {
    if (
      error instanceof CustomerConsentAlreadyExistsError ||
      isUniqueViolation(error, "customer_consent_customer_channel_unique")
    ) {
      return duplicateConsentResult();
    }
    return {
      consent: undefined,
      event: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function duplicateConsentResult(): CustomerConsentCreateResult {
  return {
    consent: undefined,
    event: undefined,
    userErrors: [
      {
        message: "A consent already exists for this customer and channel",
        code: "DUPLICATE_CONSENT",
        field: ["channel"],
      },
    ],
  };
}
