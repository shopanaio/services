import { BaseScript, Transactional, type UserError } from "../../kernel/BaseScript.js";
import type { ModerationCasePatch } from "../../repositories/moderation/ModerationRepository.js";
import {
  conflictError,
  hasOwn,
  internalError,
  notFoundError,
} from "./StoreConfigurationUpdateScript.js";
import type { ModerationCaseUpdateParams, ModerationCaseUpdateResult } from "./types.js";

export class ModerationCaseUpdateScript extends BaseScript<
  ModerationCaseUpdateParams,
  ModerationCaseUpdateResult
> {
  @Transactional()
  protected async execute(params: ModerationCaseUpdateParams): Promise<ModerationCaseUpdateResult> {
    const current = await this.repository.moderation.findCaseById(params.moderationCaseId);
    if (!current) {
      return { userErrors: [notFoundError("Moderation case", "moderationCaseId")] };
    }

    const input = params.operations ?? {};
    const patch: ModerationCasePatch = {};
    const errors: UserError[] = [];
    if (input.details) {
      if (hasOwn(input.details, "priority")) {
        const priority = input.details.priority;
        if (priority == null || !Number.isInteger(priority) || priority < 0 || priority > 100) {
          errors.push({
            message: "Priority must be an integer between 0 and 100",
            code: "INVALID_PRIORITY",
            field: ["operations", "details", "priority"],
          });
        } else {
          patch.priority = priority;
        }
      }
      if (hasOwn(input.details, "reasonCode")) {
        const reasonCode = input.details.reasonCode?.trim();
        if (!reasonCode || reasonCode.length > 64) {
          errors.push({
            message: "Reason code must contain between 1 and 64 characters",
            code: "INVALID_REASON",
            field: ["operations", "details", "reasonCode"],
          });
        } else {
          patch.reasonCode = reasonCode;
        }
      }
      if (hasOwn(input.details, "assignedToPrincipalId")) {
        patch.assignedToPrincipalId = input.details.assignedToPrincipalId?.trim() || null;
        if (current.status === "OPEN" && patch.assignedToPrincipalId) {
          patch.status = "IN_REVIEW";
        } else if (current.status === "IN_REVIEW" && !patch.assignedToPrincipalId) {
          patch.status = "OPEN";
        }
      }
      if (hasOwn(input.details, "dueAt")) {
        if (input.details.dueAt == null) {
          patch.dueAt = null;
        } else {
          const dueAt = new Date(input.details.dueAt);
          if (Number.isNaN(dueAt.getTime()) || dueAt.getTime() < Date.now()) {
            errors.push({
              message: "Due date must be a valid future date",
              code: "INVALID_DUE_AT",
              field: ["operations", "details", "dueAt"],
            });
          } else {
            patch.dueAt = dueAt.toISOString();
          }
        }
      }
    }

    if (input.resolution) {
      if (input.resolution.status !== "RESOLVED" && input.resolution.status !== "CANCELLED") {
        errors.push({
          message: "Resolution status must be RESOLVED or CANCELLED",
          code: "INVALID_STATUS",
          field: ["operations", "resolution", "status"],
        });
      }
      const code = input.resolution.resolutionCode?.trim() || null;
      const note = input.resolution.resolutionNote?.trim() || null;
      if (code && code.length > 64) {
        errors.push({
          message: "Resolution code cannot exceed 64 characters",
          code: "INVALID_RESOLUTION_CODE",
          field: ["operations", "resolution", "resolutionCode"],
        });
      }
      if (note && note.length > 2000) {
        errors.push({
          message: "Resolution note cannot exceed 2000 characters",
          code: "INVALID_RESOLUTION_NOTE",
          field: ["operations", "resolution", "resolutionNote"],
        });
      }
      patch.status = input.resolution.status;
      patch.resolutionCode = code;
      patch.resolutionNote = note;
      patch.resolvedByPrincipalId = this.context.hasUser ? this.currentUser.id : null;
      patch.resolvedAt = new Date().toISOString();
    }
    if (errors.length > 0) return { userErrors: errors };

    const updated = await this.repository.moderation.updateCase(
      params.moderationCaseId,
      params.expectedUpdatedAt,
      patch,
    );
    if (updated.status === "applied") {
      return {
        moderationCase: {
          id: updated.value.id,
          contentId: updated.value.contentId,
        },
        userErrors: [],
      };
    }
    return updated.status === "conflict"
      ? { userErrors: [conflictError("Moderation case", "expectedUpdatedAt")] }
      : { userErrors: [notFoundError("Moderation case", "moderationCaseId")] };
  }

  protected handleError(): ModerationCaseUpdateResult {
    return { userErrors: [internalError()] };
  }
}
