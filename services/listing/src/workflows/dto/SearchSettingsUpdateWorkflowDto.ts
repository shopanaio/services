import type { UserError } from "../../kernel/BaseScript.js";
import type {
  SearchProductBoostCreateParams,
  SearchProductBoostDeleteParams,
  SearchProductBoostUpdateParams,
  SearchSettingsUpdateParams,
  SearchSynonymGroupCreateParams,
  SearchSynonymGroupDeleteParams,
  SearchSynonymGroupUpdateParams,
} from "../../scripts/search/types.js";

export interface SearchSettingsUpdateWorkflowInput {
  expectedVersion: number;
  operations: SearchSettingsUpdateOperation[];
  context: SearchSettingsWorkflowContext;
}

export interface SearchSettingsWorkflowContext {
  organizationId: string;
  storeId: string;
  userId?: string;
  locale: string;
  requestId: string;
}

export interface SearchSettingsOperationMeta {
  fieldPrefix: string[];
}

export type SearchSettingsUpdateOperation =
  | {
      type: "settingsUpdate";
      params: SearchSettingsUpdateParams;
      meta?: SearchSettingsOperationMeta;
    }
  | {
      type: "synonymGroupCreate";
      params: SearchSynonymGroupCreateParams;
      meta?: SearchSettingsOperationMeta;
    }
  | {
      type: "synonymGroupUpdate";
      params: SearchSynonymGroupUpdateParams;
      meta?: SearchSettingsOperationMeta;
    }
  | {
      type: "synonymGroupDelete";
      params: SearchSynonymGroupDeleteParams;
      meta?: SearchSettingsOperationMeta;
    }
  | {
      type: "productBoostCreate";
      params: SearchProductBoostCreateParams;
      meta?: SearchSettingsOperationMeta;
    }
  | {
      type: "productBoostUpdate";
      params: SearchProductBoostUpdateParams;
      meta?: SearchSettingsOperationMeta;
    }
  | {
      type: "productBoostDelete";
      params: SearchProductBoostDeleteParams;
      meta?: SearchSettingsOperationMeta;
    };

export interface SearchSettingsUpdateWorkflowResult {
  settings: { version: number } | null;
  operationResults: SearchSettingsOperationResult[];
  userErrors: UserError[];
}

export interface SearchSettingsOperationResult {
  type: SearchSettingsUpdateOperation["type"];
  applied: boolean;
  clientMutationId?: string;
  entityId?: string;
  errors: UserError[];
}

export interface SearchSettingsOperationStepResult
  extends SearchSettingsOperationResult {
  cacheKeys: string[];
}
