import type { UserError } from "../../../kernel/BaseScript.js";
import type { ApiKey } from "../../../repositories/models/index.js";
import type { ApiKeyActionPayload } from "./shared.js";

export interface ApiKeyCreateParams {
  projectId: string;
  name: string;
  createdById: string;
  dueDate?: Date;
}

export interface ApiKeyCreateResult {
  apiKey?: ApiKey;
  rawKey?: string;
  userErrors: UserError[];
}

export interface ApiKeyRevokeParams {
  id: string;
}

export type ApiKeyRevokeResult = ApiKeyActionPayload;

export interface ApiKeyDeleteParams {
  id: string;
}

export interface ApiKeyDeleteResult {
  deletedApiKeyId?: string;
  userErrors: UserError[];
}
