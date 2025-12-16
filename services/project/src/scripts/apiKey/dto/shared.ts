import type { UserError } from "../../../kernel/BaseScript.js";
import type { ApiKey } from "../../../repositories/models/index.js";

export interface ApiKeyPayload {
  apiKey?: ApiKey;
  userErrors: UserError[];
}

export interface ApiKeyActionPayload {
  success: boolean;
  userErrors: UserError[];
}
