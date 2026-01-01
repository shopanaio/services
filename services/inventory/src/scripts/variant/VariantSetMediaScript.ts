import { BaseScript, type UserError } from "../../kernel/BaseScript.js";
import type { Variant } from "../../repositories/models/index.js";

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

    await this.repository.media.setVariantMedia(variantId, fileIds);

    this.logger.info({ variantId, fileCount: fileIds.length }, "Variant media set successfully");

    return { variant, userErrors: [] };
  }

  protected handleError(_error: unknown): VariantSetMediaResult {
    return {
      variant: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
