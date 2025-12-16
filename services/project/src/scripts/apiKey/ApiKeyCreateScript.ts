import { BaseScript } from "../../kernel/BaseScript.js";
import type { ApiKeyCreateParams, ApiKeyCreateResult } from "./dto/index.js";

export class ApiKeyCreateScript extends BaseScript<ApiKeyCreateParams, ApiKeyCreateResult> {
  protected async execute(params: ApiKeyCreateParams): Promise<ApiKeyCreateResult> {
    // Create API key
    const result = await this.repository.apiKey.create(params.projectId, {
      name: params.name,
      createdById: params.createdById,
      dueDate: params.dueDate,
    });

    this.logger.info({ apiKeyId: result.apiKey.id }, "API key created");

    return {
      apiKey: result.apiKey,
      rawKey: result.rawKey,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): ApiKeyCreateResult {
    return {
      apiKey: undefined,
      rawKey: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
