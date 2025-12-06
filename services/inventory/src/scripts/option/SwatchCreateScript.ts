import { BaseScript, type UserError } from "../../kernel/BaseScript.js";
import type { ProductOptionSwatch } from "../../repositories/models/index.js";

export interface SwatchCreateParams {
  readonly swatchType: string;
  readonly colorOne?: string;
  readonly colorTwo?: string;
  readonly fileId?: string;
  readonly metadata?: unknown;
}

export interface SwatchCreateResult {
  swatch?: ProductOptionSwatch;
  userErrors: UserError[];
}

export class SwatchCreateScript extends BaseScript<SwatchCreateParams, SwatchCreateResult> {
  protected async execute(params: SwatchCreateParams): Promise<SwatchCreateResult> {
    const { swatchType, colorOne, colorTwo, fileId, metadata } = params;

    const swatch = await this.repository.option.createSwatch({
      swatchType,
      colorOne: colorOne ?? null,
      colorTwo: colorTwo ?? null,
      imageId: fileId ?? null,
      metadata: metadata ?? null,
    });

    return { swatch, userErrors: [] };
  }

  protected handleError(_error: unknown): SwatchCreateResult {
    return {
      swatch: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
