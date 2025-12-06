import { BaseScript } from "../../kernel/BaseScript.js";
import type { SwatchCreateParams, SwatchCreateResult } from "./dto/index.js";

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
