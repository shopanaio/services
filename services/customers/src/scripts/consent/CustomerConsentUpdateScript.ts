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

export interface CustomerConsentUpdateParams {
  id: string;
  operations: {
    customerId?: string | null;
    channel?: CustomerConsent["channel"] | null;
    state?: CustomerConsentAdminState | null;
    optInLevel?: CustomerConsent["optInLevel"] | null;
    contactPoint?: string | null;
    sourceLocationId?: string | null;
    evidence?: Record<string, unknown> | null;
  };
  requestId: string;
}

export interface CustomerConsentUpdateResult {
  consent?: { id: string };
  event?: { id: string };
  affectedCustomerIds: string[];
  userErrors: UserError[];
}

export class CustomerConsentUpdateScript extends BaseScript<
  CustomerConsentUpdateParams,
  CustomerConsentUpdateResult
> {
  @Transactional()
  protected async execute(
    params: CustomerConsentUpdateParams
  ): Promise<CustomerConsentUpdateResult> {
    const current = await this.repository.consent.findById(params.id);
    if (!current) return notFound();

    const errors = validateOperations(params.operations);
    const customerId = hasOwn(params.operations, "customerId")
      ? params.operations.customerId
      : current.customerId;
    const channel = hasOwn(params.operations, "channel")
      ? params.operations.channel
      : current.channel;
    const state = hasOwn(params.operations, "state")
      ? params.operations.state
      : current.state;
    const optInLevel = hasOwn(params.operations, "optInLevel")
      ? params.operations.optInLevel
      : current.optInLevel;
    const contactPoint = hasOwn(params.operations, "contactPoint")
      ? params.operations.contactPoint
      : current.contactPoint;
    const sourceLocationId = hasOwn(params.operations, "sourceLocationId")
      ? params.operations.sourceLocationId
      : current.sourceLocationId;

    if (!customerId || !channel || !state || !optInLevel || !contactPoint) {
      return {
        consent: undefined,
        event: undefined,
        affectedCustomerIds: [current.customerId],
        userErrors: errors,
      };
    }

    if (!(await this.repository.customer.exists(customerId))) {
      errors.push({
        message: "Customer not found",
        code: "NOT_FOUND",
        field: ["customerId"],
      });
    }

    const relationChanged =
      customerId !== current.customerId || channel !== current.channel;
    if (relationChanged && (await this.repository.consent.hasEvents(params.id))) {
      errors.push({
        message: "Customer or channel cannot change after consent evidence exists",
        code: "CONSENT_RELATION_LOCKED",
        field: [customerId !== current.customerId ? "customerId" : "channel"],
      });
    }
    const owner = await this.repository.consent.findByCustomerAndChannel(
      customerId,
      channel
    );
    if (owner && owner.id !== params.id) {
      errors.push(duplicateConsentError());
    }
    if (errors.length > 0) {
      return {
        consent: undefined,
        event: undefined,
        affectedCustomerIds: [...new Set([current.customerId, customerId])],
        userErrors: errors,
      };
    }

    try {
      const result = await this.repository.consent.update({
        id: params.id,
        customerId,
        channel,
        state,
        optInLevel,
        contactPoint,
        source: "admin",
        sourceLocationId,
        actorType: this.context.hasUser ? "user" : "service",
        actorId: this.context.hasUser ? this.currentUser.id : null,
        requestId: params.requestId,
        idempotencyKey: `${params.requestId}:customerConsentUpdate`,
        evidence: params.operations.evidence ?? {},
      });
      if (!result) return notFound();
      const affectedCustomerIds = [
        ...new Set([result.previousCustomerId, result.consent.customerId]),
      ];
      this.logger.info(
        {
          consentId: result.consent.id,
          eventId: result.event.id,
          customerId: result.consent.customerId,
        },
        "Customer consent updated"
      );
      return {
        consent: { id: result.consent.id },
        event: { id: result.event.id },
        affectedCustomerIds,
        userErrors: [],
      };
    } catch (error) {
      if (
        error instanceof CustomerConsentAlreadyExistsError ||
        isUniqueViolation(error, "customer_consent_customer_channel_unique")
      ) {
        return {
          consent: undefined,
          event: undefined,
          affectedCustomerIds: [current.customerId],
          userErrors: [duplicateConsentError()],
        };
      }
      throw error;
    }
  }

  protected handleError(_error: unknown): CustomerConsentUpdateResult {
    return {
      consent: undefined,
      event: undefined,
      affectedCustomerIds: [],
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function validateOperations(
  operations: CustomerConsentUpdateParams["operations"]
): UserError[] {
  const errors: UserError[] = [];
  for (const field of [
    "customerId",
    "channel",
    "state",
    "optInLevel",
    "contactPoint",
  ] as const) {
    if (hasOwn(operations, field) && operations[field] == null) {
      errors.push({
        message: "Value cannot be null",
        code: "INVALID_VALUE",
        field: [field],
      });
    }
  }
  if (
    typeof operations.contactPoint === "string" &&
    operations.contactPoint.trim().length === 0
  ) {
    errors.push({
      message: "Contact point cannot be empty",
      code: "INVALID_CONTACT_POINT",
      field: ["contactPoint"],
    });
  }
  if (
    hasOwn(operations, "evidence") &&
    operations.evidence !== null &&
    !isRecord(operations.evidence)
  ) {
    errors.push({
      message: "Consent evidence must be a JSON object",
      code: "INVALID_EVIDENCE",
      field: ["evidence"],
    });
  }
  return errors;
}

function duplicateConsentError(): UserError {
  return {
    message: "A consent already exists for this customer and channel",
    code: "DUPLICATE_CONSENT",
    field: ["channel"],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(value: object, field: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function notFound(): CustomerConsentUpdateResult {
  return {
    consent: undefined,
    event: undefined,
    affectedCustomerIds: [],
    userErrors: [
      {
        message: "Customer consent not found",
        field: ["consentId"],
        code: "NOT_FOUND",
      },
    ],
  };
}
