import { BaseScript, Transactional, type UserError } from "../../kernel/BaseScript.js";

export interface VariantDeleteParams {
  readonly id: string;
  readonly permanent?: boolean;
}

export interface VariantDeleteResult {
  deletedVariantId?: string;
  userErrors: UserError[];
}

export class VariantDeleteScript extends BaseScript<VariantDeleteParams, VariantDeleteResult> {
  @Transactional()
  protected async execute(params: VariantDeleteParams): Promise<VariantDeleteResult> {
    const { id, permanent = false } = params;

    const existingVariant = await this.repository.variant.findById(id);
    if (!existingVariant) {
      return {
        deletedVariantId: undefined,
        userErrors: [{ message: "Variant not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    if (!permanent) {
      await this.repository.media.clearVariantMedia(id);
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
