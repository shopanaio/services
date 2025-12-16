import { BaseScript } from "../../kernel/BaseScript.js";
import type { ApiKeyRevokeParams, ApiKeyRevokeResult } from "./dto/index.js";

export class ApiKeyRevokeScript extends BaseScript<ApiKeyRevokeParams, ApiKeyRevokeResult> {
  protected async execute(params: ApiKeyRevokeParams): Promise<ApiKeyRevokeResult> {
    // Check if API key exists
    const apiKey = await this.repository.apiKey.findById(params.id);
    if (!apiKey) {
      return {
        success: false,
        userErrors: [{ message: "API key not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    // Revoke API key
    const revoked = await this.repository.apiKey.revoke(params.id);

    if (!revoked) {
      return {
        success: false,
        userErrors: [{ message: "Failed to revoke API key", code: "REVOKE_FAILED" }],
      };
    }

    this.logger.info({ apiKeyId: params.id }, "API key revoked");

    return {
      success: true,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): ApiKeyRevokeResult {
    return {
      success: false,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
