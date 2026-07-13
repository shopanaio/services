import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  SearchSettingsValueInput,
  SearchTextField,
} from "../../repositories/search/searchRepositoryTypes.js";
import { searchSettingsCacheKey } from "../../search/configuration/cacheKeys.js";
import { SearchFieldRegistry } from "../../search/planner/SearchFieldRegistry.js";
import { SearchConfigurationInputError } from "./searchConfigurationValidation.js";
import { searchConfigurationUserErrors } from "./scriptError.js";
import type {
  SearchSettingsResult,
  SearchSettingsUpdateParams,
  SearchSettingsWriteParams,
} from "./types.js";

const fieldRegistry = new SearchFieldRegistry();

export class SearchSettingsUpdateScript extends BaseScript<
  SearchSettingsUpdateParams,
  SearchSettingsResult
> {
  protected async execute(
    params: SearchSettingsUpdateParams,
  ): Promise<SearchSettingsResult> {
    const values = validateAndNormalizeSearchSettings(params);
    const result = await this.repository.searchSettings.update({
      ...values,
    });

    if (result.status === "not_found") {
      return {
        userErrors: [{
          message: "Search settings are not initialized",
          field: [],
          code: "SETTINGS_NOT_INITIALIZED",
        }],
      };
    }
    return {
      settings: result.value,
      cacheKeys: [searchSettingsCacheKey(this.context.store.id)],
      userErrors: [],
    };
  }

  protected handleError(error: unknown): SearchSettingsResult {
    return { userErrors: searchConfigurationUserErrors(error) };
  }
}

export function validateAndNormalizeSearchSettings(
  params: SearchSettingsWriteParams,
): SearchSettingsValueInput {
  if (params.fields.length === 0) {
    throw new SearchConfigurationInputError([{
      message: "At least one search field must be enabled",
      field: ["input", "fields"],
      code: "EMPTY_FIELDS",
    }]);
  }

  const userErrors: Array<{
    message: string;
    field: string[];
    code: string;
  }> = [];
  const seen = new Set<SearchTextField>();
  const weights = new Map<SearchTextField, number>();

  params.fields.forEach((configuration, index) => {
    const field = configuration.field;
    fieldRegistry.get(field);
    if (seen.has(field)) {
      userErrors.push({
        message: "Search field must not be provided more than once",
        field: ["input", "fields", String(index), "field"],
        code: "DUPLICATE_FIELD",
      });
    } else {
      seen.add(field);
      weights.set(field, configuration.weight);
    }
    if (
      !Number.isFinite(configuration.weight) ||
      configuration.weight <= 0 ||
      configuration.weight > 100
    ) {
      userErrors.push({
        message: "Search field weight must be greater than 0 and at most 100",
        field: ["input", "fields", String(index), "weight"],
        code: "INVALID_WEIGHT",
      });
    }
  });

  if (userErrors.length > 0) {
    throw new SearchConfigurationInputError(userErrors);
  }

  const enabledFields = fieldRegistry.list()
    .map((definition) => definition.field)
    .filter((field) => seen.has(field));
  const fieldWeights: Partial<Record<SearchTextField, number>> = {};
  for (const field of enabledFields) {
    fieldWeights[field] = weights.get(field)!;
  }

  return {
    enabledFields,
    fieldWeights,
    typoToleranceEnabled: params.typoToleranceEnabled,
    outOfStockPolicy: params.outOfStockPolicy,
  };
}
