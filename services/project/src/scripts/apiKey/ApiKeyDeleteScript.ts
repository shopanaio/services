import { BaseScript } from "../../kernel/BaseScript.js";
import type { ApiKeyDeleteParams, ApiKeyDeleteResult } from "./dto/index.js";

export class ApiKeyDeleteScript extends BaseScript<ApiKeyDeleteParams, ApiKeyDeleteResult> {
  protected async execute(params: ApiKeyDeleteParams): Promise<ApiKeyDeleteResult> {
    // Check if API key exists
    const apiKey = await this.repository.apiKey.findById(params.id);
    if (!apiKey) {
      return {
        deletedApiKeyId: undefined,
        userErrors: [{ message: "API key not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    // Soft delete API key
    const deleted = await this.repository.apiKey.softDelete(params.id);

    if (!deleted) {
      return {
        deletedApiKeyId: undefined,
        userErrors: [{ message: "Failed to delete API key", code: "DELETE_FAILED" }],
      };
    }

    this.logger.info({ apiKeyId: params.id }, "API key deleted");

    return {
      deletedApiKeyId: params.id,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): ApiKeyDeleteResult {
    return {
      deletedApiKeyId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
