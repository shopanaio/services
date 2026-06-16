import { BaseScript } from "../../kernel/BaseScript.js";
import type { ApiKeyCreateParams, ApiKeyCreateResult } from "./dto/index.js";

export class ApiKeyCreateScript extends BaseScript<ApiKeyCreateParams, ApiKeyCreateResult> {
  protected async execute(params: ApiKeyCreateParams): Promise<ApiKeyCreateResult> {
    // TODO
    throw new Error("Not implemented");
  }

  protected handleError(_error: unknown): ApiKeyCreateResult {
    return {
      apiKey: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR", field: null }],
    };
  }
}
