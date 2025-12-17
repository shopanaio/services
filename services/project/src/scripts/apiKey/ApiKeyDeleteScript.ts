import { BaseScript } from "../../kernel/BaseScript.js";
import type { ApiKeyDeleteParams, ApiKeyDeleteResult } from "./dto/index.js";

export class ApiKeyDeleteScript extends BaseScript<ApiKeyDeleteParams, ApiKeyDeleteResult> {
  protected async execute(params: ApiKeyDeleteParams): Promise<ApiKeyDeleteResult> {
    // TODO
    throw new Error("Not implemented");
  }

  protected handleError(_error: unknown): ApiKeyDeleteResult {
    return {
      deletedApiKeyId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
