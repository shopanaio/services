import { BaseScript } from "../../kernel/BaseScript.js";
import type { ApiKeyRevokeParams, ApiKeyRevokeResult } from "./dto/index.js";

export class ApiKeyRevokeScript extends BaseScript<ApiKeyRevokeParams, ApiKeyRevokeResult> {
  protected async execute(params: ApiKeyRevokeParams): Promise<ApiKeyRevokeResult> {
    // TODO
    throw new Error("Not implemented");
  }

  protected handleError(_error: unknown): ApiKeyRevokeResult {
    return {
      success: false,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR", field: null }],
    };
  }
}
