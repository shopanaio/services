import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type { UserError } from "../../kernel/BaseScript.js";
import { internalError } from "./content.js";
import type {
  ModerationCaseCreateParams,
  ModerationCaseCreateResult,
} from "./types.js";

export class ModerationCaseCreateScript extends BaseScript<
  ModerationCaseCreateParams,
  ModerationCaseCreateResult
> {
  @Transactional()
  protected async execute(
    params: ModerationCaseCreateParams
  ): Promise<ModerationCaseCreateResult> {
    const reasonCode = params.reasonCode.trim();
    const priority = params.priority ?? 50;
    const dueAt = params.dueAt ? new Date(params.dueAt) : null;
    const errors: UserError[] = [];
    if (!reasonCode) errors.push({ message: "Reason code cannot be empty", code: "INVALID_REASON", field: ["reasonCode"] });
    if (priority < 0 || priority > 100) errors.push({ message: "Priority must be between 0 and 100", code: "INVALID_PRIORITY", field: ["priority"] });
    if (dueAt && (Number.isNaN(dueAt.getTime()) || dueAt.getTime() < Date.now())) {
      errors.push({ message: "Due date must be in the future", code: "INVALID_DUE_AT", field: ["dueAt"] });
    }
    if (!(await this.repository.content.findById(params.contentId))) {
      errors.push({ message: "Content was not found", code: "CONTENT_NOT_FOUND", field: ["contentId"] });
    }
    if (errors.length > 0) return { userErrors: errors };

    try {
      const created = await this.repository.moderation.createCase({
        contentId: params.contentId,
        status: "OPEN",
        priority,
        reasonCode,
        assignedToPrincipalId: params.assignedToPrincipalId?.trim() || null,
        dueAt: dueAt?.toISOString() ?? null,
        resolutionCode: null,
        resolutionNote: null,
        resolvedByPrincipalId: null,
        resolvedAt: null,
      });
      this.logger.info({ moderationCaseId: created.id }, "Review moderation case created");
      return { moderationCase: { id: created.id, contentId: created.contentId }, userErrors: [] };
    } catch (error) {
      if (isUniqueViolation(error, "moderation_case_active_content_unique")) {
        return { userErrors: [{ message: "This content already has an active moderation case", code: "ACTIVE_CASE_EXISTS", field: ["contentId"] }] };
      }
      throw error;
    }
  }

  protected handleError(): ModerationCaseCreateResult {
    return { userErrors: internalError() };
  }
}
