import { BaseScript, Transactional, type UserError } from "../../kernel/BaseScript.js";
import type { ContentReportPatch } from "../../repositories/engagement/EngagementRepository.js";
import { hasOwn, internalError, notFoundError } from "./StoreConfigurationUpdateScript.js";
import type { ContentReportUpdateParams, ContentReportUpdateResult } from "./types.js";

export class ContentReportUpdateScript extends BaseScript<
  ContentReportUpdateParams,
  ContentReportUpdateResult
> {
  @Transactional()
  protected async execute(params: ContentReportUpdateParams): Promise<ContentReportUpdateResult> {
    const current = await this.repository.engagement.findReportById(params.contentReportId);
    if (!current) {
      return { userErrors: [notFoundError("Content report", "contentReportId")] };
    }

    const input = params.operations ?? {};
    const patch: ContentReportPatch = {};
    const errors: UserError[] = [];
    if (input.assignment && hasOwn(input.assignment, "assignedToPrincipalId")) {
      const assignedTo = input.assignment.assignedToPrincipalId?.trim() || null;
      patch.assignedToPrincipalId = assignedTo;
      if (current.status === "OPEN" || current.status === "UNDER_REVIEW") {
        patch.status = assignedTo ? "UNDER_REVIEW" : "OPEN";
      }
    }
    if (input.resolution) {
      if (input.resolution.status !== "ACTIONED" && input.resolution.status !== "DISMISSED") {
        errors.push({
          message: "Resolution status must be ACTIONED or DISMISSED",
          code: "INVALID_STATUS",
          field: ["operations", "resolution", "status"],
        });
      }
      const note = input.resolution.note?.trim() || null;
      if (note && note.length > 2000) {
        errors.push({
          message: "Resolution note cannot exceed 2000 characters",
          code: "INVALID_NOTE",
          field: ["operations", "resolution", "note"],
        });
      }
      patch.status = input.resolution.status;
      patch.resolutionNote = note;
      patch.resolvedByPrincipalId = this.context.hasUser ? this.currentUser.id : null;
      patch.resolvedAt = new Date().toISOString();
    }
    if (errors.length > 0) return { userErrors: errors };

    const updated = await this.repository.engagement.updateReport(params.contentReportId, patch);
    if (updated.status === "applied") {
      return {
        contentReport: {
          id: updated.value.id,
          contentId: updated.value.contentId,
        },
        userErrors: [],
      };
    }
    return { userErrors: [notFoundError("Content report", "contentReportId")] };
  }

  protected handleError(): ContentReportUpdateResult {
    return { userErrors: [internalError()] };
  }
}
