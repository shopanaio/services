import type { UserError } from "../../kernel/BaseScript.js";
import type {
  SearchProductBoostAggregate,
  SearchSynonymGroupAggregate,
} from "../../repositories/search/searchRepositoryTypes.js";
import type {
  SearchProductBoostCreateParams,
  SearchProductBoostDeleteParams,
  SearchProductBoostUpdateParams,
  SearchSynonymGroupCreateParams,
  SearchSynonymGroupDeleteParams,
  SearchSynonymGroupUpdateParams,
} from "../../scripts/search/types.js";
import type { SearchSettingsWorkflowContext } from "./SearchSettingsUpdateWorkflowDto.js";

export interface SearchSynonymGroupCreateWorkflowInput {
  params: SearchSynonymGroupCreateParams;
  context: SearchSettingsWorkflowContext;
}

export interface SearchSynonymGroupUpdateWorkflowInput {
  params: SearchSynonymGroupUpdateParams;
  context: SearchSettingsWorkflowContext;
}

export interface SearchProductBoostCreateWorkflowInput {
  params: SearchProductBoostCreateParams;
  context: SearchSettingsWorkflowContext;
}

export interface SearchProductBoostUpdateWorkflowInput {
  params: SearchProductBoostUpdateParams;
  context: SearchSettingsWorkflowContext;
}

export interface SearchSynonymGroupDeleteWorkflowInput {
  params: SearchSynonymGroupDeleteParams;
  context: SearchSettingsWorkflowContext;
}

export interface SearchProductBoostDeleteWorkflowInput {
  params: SearchProductBoostDeleteParams;
  context: SearchSettingsWorkflowContext;
}

export interface SearchSynonymGroupMutationWorkflowResult {
  synonymGroup?: SearchSynonymGroupAggregate;
  userErrors: UserError[];
}

export interface SearchProductBoostMutationWorkflowResult {
  productBoost?: SearchProductBoostAggregate;
  userErrors: UserError[];
}
