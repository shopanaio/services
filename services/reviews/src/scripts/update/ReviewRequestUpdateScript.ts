import { BaseScript, Transactional, type UserError } from "../../kernel/BaseScript.js";
import type { ReviewRequestPatch } from "../../repositories/request/ReviewRequestRepository.js";
import {
  conflictError,
  hasOwn,
  internalError,
  notFoundError,
} from "./StoreConfigurationUpdateScript.js";
import type {
  ReviewRequestUpdateParams,
  ReviewRequestUpdateResult,
} from "./types.js";

type RequestEventType =
  | "SCHEDULED"
  | "CANCELLED"
  | "EXPIRED";

const terminalStatuses = new Set(["CANCELLED", "EXPIRED", "SUBMITTED"]);

export class ReviewRequestUpdateScript extends BaseScript<
  ReviewRequestUpdateParams,
  ReviewRequestUpdateResult
> {
  @Transactional()
  protected async execute(
    params: ReviewRequestUpdateParams
  ): Promise<ReviewRequestUpdateResult> {
    const current = await this.repository.reviewRequest.findById(
      params.reviewRequestId
    );
    if (!current) {
      return { userErrors: [notFoundError("Review request", "reviewRequestId")] };
    }

    const input = params.operations ?? {};
    const patch: ReviewRequestPatch = {};
    const errors: UserError[] = [];
    let eventType: RequestEventType | undefined;
    let transitionReason: string | null = null;

    if (input.delivery) {
      if (hasOwn(input.delivery, "channel")) {
        if (input.delivery.channel == null) {
          errors.push(nullError(["operations", "delivery", "channel"]));
        } else {
          patch.channel = input.delivery.channel;
        }
      }
      if (hasOwn(input.delivery, "locale")) {
        const locale = input.delivery.locale?.trim();
        if (!locale || locale.length > 35) {
          errors.push({
            message: "Locale must contain between 1 and 35 characters",
            code: "INVALID_LOCALE",
            field: ["operations", "delivery", "locale"],
          });
        } else {
          patch.locale = locale;
        }
      }
    }

    if (input.schedule) {
      const scheduledAt = new Date(input.schedule.scheduledAt);
      if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now()) {
        errors.push({
          message: "scheduledAt must be a valid future date",
          code: "INVALID_SCHEDULE",
          field: ["operations", "schedule", "scheduledAt"],
        });
      } else {
        patch.scheduledAt = scheduledAt.toISOString();
      }

      if (hasOwn(input.schedule, "expiresAt")) {
        if (input.schedule.expiresAt == null) {
          patch.expiresAt = null;
        } else {
          const expiresAt = new Date(input.schedule.expiresAt);
          if (
            Number.isNaN(expiresAt.getTime()) ||
            (!Number.isNaN(scheduledAt.getTime()) && expiresAt < scheduledAt)
          ) {
            errors.push({
              message: "expiresAt must be on or after scheduledAt",
              code: "INVALID_EXPIRY",
              field: ["operations", "schedule", "expiresAt"],
            });
          } else {
            patch.expiresAt = expiresAt.toISOString();
          }
        }
      }
    }

    if (input.transition) {
      transitionReason = input.transition.reason?.trim() || null;
      const action = input.transition.action;
      if (terminalStatuses.has(current.status)) {
        errors.push({
          message: `Review request in ${current.status} status cannot be transitioned`,
          code: "INVALID_TRANSITION",
          field: ["operations", "transition", "action"],
        });
      } else if (action === "CANCEL") {
        patch.status = "CANCELLED";
        eventType = "CANCELLED";
      } else if (action === "EXPIRE") {
        patch.status = "EXPIRED";
        eventType = "EXPIRED";
      } else if (action === "RESCHEDULE") {
        if (!input.schedule) {
          errors.push({
            message: "A schedule is required to reschedule a review request",
            code: "SCHEDULE_REQUIRED",
            field: ["operations", "schedule"],
          });
        } else {
          patch.status = "SCHEDULED";
          patch.lastError = null;
          patch.providerMessageId = null;
          eventType = "SCHEDULED";
        }
      } else if (action === "RETRY") {
        if (current.status !== "FAILED") {
          errors.push({
            message: "Only a failed review request can be retried",
            code: "INVALID_TRANSITION",
            field: ["operations", "transition", "action"],
          });
        } else {
          patch.status = "SCHEDULED";
          patch.scheduledAt = input.schedule
            ? patch.scheduledAt
            : new Date().toISOString();
          patch.attemptCount = current.attemptCount + 1;
          patch.lastError = null;
          patch.providerMessageId = null;
          eventType = "SCHEDULED";
        }
      }
    }
    if (errors.length > 0) return { userErrors: errors };

    const updated = await this.repository.reviewRequest.update(
      params.reviewRequestId,
      params.expectedUpdatedAt,
      patch
    );
    if (updated.status !== "applied") {
      return updated.status === "conflict"
        ? { userErrors: [conflictError("Review request", "expectedUpdatedAt")] }
        : { userErrors: [notFoundError("Review request", "reviewRequestId")] };
    }

    if (eventType) {
      await this.repository.reviewRequest.appendEvent({
        reviewRequestId: updated.value.id,
        type: eventType,
        providerEventId: null,
        metadata: {
          source: "ADMIN",
          ...(transitionReason ? { reason: transitionReason } : {}),
        },
        occurredAt: new Date().toISOString(),
      });
    }
    return { reviewRequest: { id: updated.value.id }, userErrors: [] };
  }

  protected handleError(): ReviewRequestUpdateResult {
    return { userErrors: [internalError()] };
  }
}

function nullError(field: string[]): UserError {
  return {
    message: `${field.at(-1)} cannot be null`,
    code: "INVALID_VALUE",
    field,
  };
}
