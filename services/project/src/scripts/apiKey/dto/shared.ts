import type { UserError } from "@shopana/shared-kernel";
import type { ApiKey } from "../../../repositories/models/index.js";

export interface ApiKeyPayload {
  apiKey?: ApiKey;
  userErrors: UserError[];
}

export interface ApiKeyActionPayload {
  success: boolean;
  userErrors: UserError[];
}
