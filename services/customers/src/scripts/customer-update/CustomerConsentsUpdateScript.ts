import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { CustomerConsentsUpdateOperation } from "../../workflows/dto/index.js";
import {
  internalSectionError,
  sectionErrors,
  sectionSuccess,
  type CustomerSectionResult,
} from "./types.js";

export interface CustomerConsentsUpdateParams {
  customerId: string;
  operations: CustomerConsentsUpdateOperation["params"];
  requestId: string;
}

export class CustomerConsentsUpdateScript extends BaseScript<
  CustomerConsentsUpdateParams,
  CustomerSectionResult
> {
  @Transactional()
  protected async execute(
    params: CustomerConsentsUpdateParams
  ): Promise<CustomerSectionResult> {
    const errors: Array<{ message: string; code: string; field: string[] }> = [];
    const channels = new Set<string>();

    for (const [index, input] of params.operations.set.entries()) {
      if (channels.has(input.channel)) {
        errors.push({
          message: "A consent channel can be updated only once",
          code: "DUPLICATE_CHANNEL",
          field: ["set", String(index), "channel"],
        });
      }
      channels.add(input.channel);
      if (input.contactPoint.trim().length === 0) {
        errors.push({
          message: "Contact point cannot be empty",
          code: "INVALID_CONTACT_POINT",
          field: ["set", String(index), "contactPoint"],
        });
      } else if (!isValidContactPoint(input.channel, input.contactPoint)) {
        errors.push({
          message: "Contact point does not match the selected channel",
          code: "INVALID_CONTACT_POINT",
          field: ["set", String(index), "contactPoint"],
        });
      }
    }
    if (errors.length > 0) return sectionErrors(errors);

    for (const [index, input] of params.operations.set.entries()) {
      await this.repository.consent.set({
        customerId: params.customerId,
        channel: input.channel,
        state: input.state,
        optInLevel: input.optInLevel ?? undefined,
        contactPoint: input.contactPoint,
        source: "admin",
        sourceLocationId: input.sourceLocationId ?? null,
        actorType: this.context.hasUser ? "user" : "service",
        actorId: this.context.hasUser ? this.currentUser.id : null,
        requestId: params.requestId,
        idempotencyKey: `${params.requestId}:customerUpdate:consent:${index}`,
        evidence: input.evidence ?? {},
      });
    }

    const changed = params.operations.set.length > 0;
    if (changed) {
      await this.invalidateDynamicSegments(params.customerId, ["consent"], "consent");
    }
    return sectionSuccess(changed);
  }

  protected handleError(_error: unknown): CustomerSectionResult {
    return internalSectionError();
  }
}

function isValidContactPoint(
  channel: CustomerConsentsUpdateOperation["params"]["set"][number]["channel"],
  value: string,
): boolean {
  const contactPoint = value.trim();
  switch (channel) {
    case "EMAIL":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(contactPoint);
    case "SMS":
    case "WHATSAPP":
      return /^\+[1-9][0-9]{6,14}$/u.test(contactPoint);
    case "PUSH":
      return contactPoint.length > 0;
  }
}
