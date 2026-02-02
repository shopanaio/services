import { BaseScript, type UserError } from "../../kernel/BaseScript.js";
import type { Variant } from "../../repositories/models/index.js";
import type { BackRefNotifyInput } from "../../sagas/index.js";
import {
  type ScriptResult,
  successResult,
  unchangedResult,
  singleError,
} from "../types/ScriptResult.js";
import type { MediaChanges } from "../types/ProductChanges.js";

export interface VariantUpdateMediaParams {
  readonly variantId: string;
  readonly fileIds: string[];
}

export type VariantUpdateMediaResult = ScriptResult<Variant, MediaChanges>;

export class VariantUpdateMediaScript extends BaseScript<
  VariantUpdateMediaParams,
  VariantUpdateMediaResult
> {
  protected async execute(
    params: VariantUpdateMediaParams
  ): Promise<VariantUpdateMediaResult> {
    const { variantId, fileIds } = params;

    const variant = await this.repository.variant.findById(variantId);
    if (!variant) {
      return singleError("Variant not found", "NOT_FOUND", ["variantId"]);
    }

    const existingMedia = await this.repository.media.getVariantMedia(variantId);
    const previousFileIds = existingMedia.map((media) => media.fileId);

    // Check if anything actually changed (including order)
    const uniqueNextFileIds = Array.from(new Set(fileIds));
    const hasChanges =
      previousFileIds.length !== uniqueNextFileIds.length ||
      previousFileIds.some((fileId, index) => fileId !== uniqueNextFileIds[index]);

    if (!hasChanges) {
      this.logger.debug({ variantId }, "No media changes detected");
      return unchangedResult(variant);
    }

    await this.repository.media.setVariantMedia(variantId, fileIds);
    await this.notifyBackRefs(variantId, fileIds, previousFileIds);

    this.logger.info(
      { variantId, fileCount: fileIds.length },
      "Variant media updated successfully"
    );

    const changes: MediaChanges = {
      fileIds: uniqueNextFileIds,
    };

    return successResult(variant, changes);
  }

  protected handleError(_error: unknown): VariantUpdateMediaResult {
    return {
      result: null,
      changes: null,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }

  private async notifyBackRefs(
    variantId: string,
    nextFileIds: string[],
    previousFileIds: string[]
  ): Promise<void> {
    const uniqueNextFileIds = Array.from(new Set(nextFileIds));

    try {
      await this.services.broker.runSaga<unknown, BackRefNotifyInput>(
        "backRefNotify",
        {
          entityRef: {
            service: "inventory",
            entityType: "variant",
            entityId: variantId,
          },
          fileIds: uniqueNextFileIds,
        },
        {
          source: "workflow",
          workflowId: `variantUpdateMedia:${variantId}`,
          stepId: "notifyBackRefs",
        }
      );
    } catch (error) {
      // Log at error level for saga start failures (not transient)
      // These indicate configuration or code issues, not network problems
      this.logger.error(
        { variantId, error, fileCount: uniqueNextFileIds.length },
        "Failed to start backref sync saga"
      );
      // Note: We don't rethrow because backref sync is best-effort.
      // The variant media update already succeeded in the database.
      // Manual reconciliation can fix orphaned backrefs later if needed.
    }
  }
}
