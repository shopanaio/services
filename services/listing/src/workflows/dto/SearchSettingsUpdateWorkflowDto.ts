import type { UserError } from "../../kernel/BaseScript.js";
import type { SearchSettingsUpdateParams } from "../../scripts/search/types.js";

export interface SearchSettingsUpdateWorkflowInput {
  expectedVersion: number;
  settings: SearchSettingsUpdateParams;
  context: SearchSettingsWorkflowContext;
}

export interface SearchSettingsWorkflowContext {
  organizationId: string;
  storeId: string;
  userId?: string;
  locale: string;
  requestId: string;
}

export interface SearchSettingsUpdateWorkflowResult {
  settings: { version: number } | null;
  operationResults: SearchSettingsOperationResult[];
  userErrors: UserError[];
}

export interface SearchSettingsOperationResult {
  type: "settingsUpdate";
  applied: boolean;
  errors: UserError[];
}
