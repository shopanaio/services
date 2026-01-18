import { DBOS } from "@shopana/workflows";
import { BaseScript, type UserError } from "../../kernel/BaseScript.js";
import type { Variant } from "../../repositories/models/index.js";
import { BackRefNotifyWorkflow } from "../../workflows/BackRefNotifyWorkflow.js";

export interface VariantSetMediaParams {
  readonly variantId: string;
  readonly fileIds: string[];
}

export interface VariantSetMediaResult {
  variant?: Variant;
  userErrors: UserError[];
}

export class VariantSetMediaScript extends BaseScript<VariantSetMediaParams, VariantSetMediaResult> {
  protected async execute(params: VariantSetMediaParams): Promise<VariantSetMediaResult> {
    const { variantId, fileIds } = params;

    const variant = await this.repository.variant.findById(variantId);
    if (!variant) {
      return {
        variant: undefined,
        userErrors: [{ message: "Variant not found", field: ["variantId"], code: "NOT_FOUND" }],
      };
    }

    const existingMedia = await this.repository.media.getVariantMedia(variantId);
    const previousFileIds = existingMedia.map((media) => media.fileId);

    await this.repository.media.setVariantMedia(variantId, fileIds);
    await this.notifyBackRefs(variantId, fileIds, previousFileIds);

    this.logger.info({ variantId, fileCount: fileIds.length }, "Variant media set successfully");

    return { variant, userErrors: [] };
  }

  protected handleError(_error: unknown): VariantSetMediaResult {
    return {
      variant: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }

  private async notifyBackRefs(
    variantId: string,
    nextFileIds: string[],
    previousFileIds: string[]
  ): Promise<void> {
    const uniqueNextFileIds = Array.from(new Set(nextFileIds));
    const previousSet = new Set(previousFileIds);
    const nextSet = new Set(uniqueNextFileIds);
    const hasChanges =
      previousFileIds.length !== uniqueNextFileIds.length ||
      previousFileIds.some((fileId) => !nextSet.has(fileId)) ||
      uniqueNextFileIds.some((fileId) => !previousSet.has(fileId));

    if (!hasChanges) {
      return;
    }

    try {
      const workflow =
        this.workflow.get<BackRefNotifyWorkflow>("backRefNotify");
      await DBOS.startWorkflow(workflow).run({
        entityRef: {
          service: "inventory",
          entityType: "variant",
          entityId: variantId,
        },
        fileIds: uniqueNextFileIds,
      });
    } catch (error) {
      // Log at error level for workflow start failures (not transient)
      // These indicate configuration or code issues, not network problems
      this.logger.error(
        { variantId, error, fileCount: uniqueNextFileIds.length },
        "Failed to start backref sync workflow"
      );
      // Note: We don't rethrow because backref sync is best-effort.
      // The variant media update already succeeded in the database.
      // Manual reconciliation can fix orphaned backrefs later if needed.
    }
  }
}
