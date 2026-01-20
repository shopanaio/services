import { DBOS } from "@shopana/shared-kernel";
import { BaseScript, type UserError } from "../../kernel/BaseScript.js";
import { EntityDeletedNotifyWorkflow } from "../../workflows/EntityDeletedNotifyWorkflow.js";

export interface VariantDeleteParams {
  readonly id: string;
  readonly permanent?: boolean;
}

export interface VariantDeleteResult {
  deletedVariantId?: string;
  userErrors: UserError[];
}

export class VariantDeleteScript extends BaseScript<VariantDeleteParams, VariantDeleteResult> {
  protected async execute(params: VariantDeleteParams): Promise<VariantDeleteResult> {
    const { id, permanent = false } = params;

    const existingVariant = await this.repository.variant.findById(id);
    if (!existingVariant) {
      return {
        deletedVariantId: undefined,
        userErrors: [{ message: "Variant not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    const deleted = permanent
      ? await this.repository.variant.hardDelete(id)
      : await this.repository.variant.softDelete(id);

    if (!deleted) {
      return {
        deletedVariantId: undefined,
        userErrors: [{ message: "Failed to delete variant", code: "DELETE_FAILED" }],
      };
    }

    if (permanent) {
      try {
        const workflow = this.workflow.get<EntityDeletedNotifyWorkflow>(
          this.services.broker.qualifyAction("entityDeletedNotify")
        );
        await DBOS.startWorkflow(workflow).run({
          entityRef: {
            service: "inventory",
            entityType: "variant",
            entityId: id,
          },
        });
      } catch (error) {
        this.logger.warn(
          { variantId: id, error },
          "Failed to notify media about deleted variant"
        );
      }
    }

    this.logger.info({ variantId: id, permanent }, "Variant deleted successfully");

    return { deletedVariantId: id, userErrors: [] };
  }

  protected handleError(_error: unknown): VariantDeleteResult {
    return {
      deletedVariantId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
