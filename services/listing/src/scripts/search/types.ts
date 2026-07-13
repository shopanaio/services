import type { UserError } from "../../kernel/BaseScript.js";
import type {
  SearchProductBoostAggregate,
  SearchSynonymGroupAggregate,
} from "../../repositories/search/searchRepositoryTypes.js";
import type {
  SearchSettings as SearchSettingsModel,
} from "../../repositories/models/index.js";
import type {
  SearchOutOfStockPolicy,
  SearchTextField,
} from "../../repositories/search/searchRepositoryTypes.js";

export interface SearchSynonymGroupWriteParams {
  locale: string;
  name: string;
  enabled: boolean;
  values: readonly string[];
}

export interface SearchSynonymGroupCreateParams
  extends SearchSynonymGroupWriteParams {
  clientMutationId: string;
}

export interface SearchSynonymGroupUpdateParams
  extends SearchSynonymGroupWriteParams {
  groupId: string;
}

export interface SearchSynonymGroupDeleteParams {
  groupId: string;
}

export interface SearchSynonymGroupResult {
  synonymGroup?: SearchSynonymGroupAggregate;
  deletedSynonymGroupId?: string;
  cacheKeys?: string[];
  userErrors: UserError[];
}

export interface SearchProductBoostWriteParams {
  locale: string;
  name: string;
  enabled: boolean;
  phrases: readonly string[];
  productIds: readonly string[];
}

export interface SearchProductBoostCreateParams
  extends SearchProductBoostWriteParams {
  clientMutationId: string;
}

export interface SearchProductBoostUpdateParams
  extends SearchProductBoostWriteParams {
  boostId: string;
}

export interface SearchProductBoostDeleteParams {
  boostId: string;
}

export interface SearchProductBoostResult {
  productBoost?: SearchProductBoostAggregate;
  deletedProductBoostId?: string;
  cacheKeys?: string[];
  userErrors: UserError[];
}

export interface SearchFieldConfiguration {
  field: SearchTextField;
  weight: number;
}

export interface SearchSettingsWriteParams {
  fields: readonly SearchFieldConfiguration[];
  typoToleranceEnabled: boolean;
  outOfStockPolicy: SearchOutOfStockPolicy;
}

export interface SearchSettingsUpdateParams extends SearchSettingsWriteParams {}

export interface SearchSettingsResult {
  settings?: SearchSettingsModel;
  cacheKeys?: string[];
  userErrors: UserError[];
}
