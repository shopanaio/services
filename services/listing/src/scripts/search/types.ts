import type { UserError } from "../../kernel/BaseScript.js";
import type {
  SearchProductBoostAggregate,
  SearchSynonymGroupAggregate,
} from "../../repositories/search/searchRepositoryTypes.js";
import type {
  SearchSettings as SearchSettingsModel,
} from "../../repositories/models/index.js";
import type {
  SearchFieldConfigurationInput,
  SearchOutOfStockPolicy,
} from "../../resolvers/admin/generated/types.js";

export interface SearchSynonymGroupWriteParams {
  locale: string;
  name: string;
  enabled: boolean;
  values: readonly string[];
}

export interface SearchSynonymGroupCreateParams
  extends SearchSynonymGroupWriteParams {}

export interface SearchSynonymGroupUpdateParams
  extends SearchSynonymGroupWriteParams {
  groupId: string;
  expectedVersion: number;
}

export interface SearchSynonymGroupDeleteParams {
  groupId: string;
  expectedVersion: number;
}

export interface SearchSynonymGroupResult {
  synonymGroup?: SearchSynonymGroupAggregate;
  deletedSynonymGroupId?: string;
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
  extends SearchProductBoostWriteParams {}

export interface SearchProductBoostUpdateParams
  extends SearchProductBoostWriteParams {
  boostId: string;
  expectedVersion: number;
}

export interface SearchProductBoostDeleteParams {
  boostId: string;
  expectedVersion: number;
}

export interface SearchProductBoostResult {
  productBoost?: SearchProductBoostAggregate;
  deletedProductBoostId?: string;
  userErrors: UserError[];
}

export interface SearchSettingsWriteParams {
  fields: readonly SearchFieldConfigurationInput[];
  typoToleranceEnabled: boolean;
  outOfStockPolicy: SearchOutOfStockPolicy;
}

export interface SearchSettingsCreateParams extends SearchSettingsWriteParams {}

export interface SearchSettingsUpdateParams extends SearchSettingsWriteParams {
  expectedVersion: number;
}

export interface SearchSettingsResult {
  settings?: SearchSettingsModel;
  currentVersion?: number;
  userErrors: UserError[];
}
