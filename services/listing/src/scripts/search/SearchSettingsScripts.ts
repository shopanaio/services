import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  SearchOutOfStockPolicy,
  SearchSettingsValueInput,
  SearchTextField,
} from "../../repositories/search/searchRepositoryTypes.js";
import type {
  SearchField,
  SearchFieldConfigurationInput,
  SearchOutOfStockPolicy as ApiSearchOutOfStockPolicy,
} from "../../resolvers/admin/generated/types.js";
import { SearchFieldRegistry } from "../../search/planner/SearchFieldRegistry.js";
import { SearchConfigurationInputError } from "./searchConfigurationValidation.js";
import { searchConfigurationUserErrors } from "./scriptError.js";
import type {
  SearchSettingsCreateParams,
  SearchSettingsResult,
  SearchSettingsUpdateParams,
  SearchSettingsWriteParams,
} from "./types.js";

const fieldRegistry = new SearchFieldRegistry();

export class SearchSettingsCreateScript extends BaseScript<
  SearchSettingsCreateParams,
  SearchSettingsResult
> {
  protected async execute(
    params: SearchSettingsCreateParams,
  ): Promise<SearchSettingsResult> {
    const values = validateAndNormalizeSettings(params);
    const result = await this.repository.searchSettings.update({
      ...values,
      expectedVersion: null,
      actorId: this.currentUser.id,
      requestId: this.context.requestId,
    });

    if (result.status === "conflict") {
      return {
        currentVersion: result.currentVersion,
        userErrors: [{
          message: "Search settings are already initialized",
          field: ["input"],
          code: "ALREADY_INITIALIZED",
        }],
      };
    }
    if (result.status === "not_found") {
      throw new Error("Search settings create returned not_found");
    }
    return { settings: result.value, userErrors: [] };
  }

  protected handleError(error: unknown): SearchSettingsResult {
    return { userErrors: searchConfigurationUserErrors(error) };
  }
}

export class SearchSettingsUpdateScript extends BaseScript<
  SearchSettingsUpdateParams,
  SearchSettingsResult
> {
  protected async execute(
    params: SearchSettingsUpdateParams,
  ): Promise<SearchSettingsResult> {
    validateSettingsExpectedVersion(params.expectedVersion);
    const values = validateAndNormalizeSettings(params);
    const result = await this.repository.searchSettings.update({
      ...values,
      expectedVersion: params.expectedVersion,
      actorId: this.currentUser.id,
      requestId: this.context.requestId,
    });

    if (result.status === "not_found") {
      return {
        userErrors: [{
          message: "Search settings are not initialized",
          field: ["input"],
          code: "NOT_INITIALIZED",
        }],
      };
    }
    if (result.status === "conflict") {
      return {
        currentVersion: result.currentVersion,
        userErrors: [{
          message:
            `Search settings version conflict; current version is ${result.currentVersion}`,
          field: ["input", "expectedVersion"],
          code: "CONFIGURATION_CONFLICT",
        }],
      };
    }
    return { settings: result.value, userErrors: [] };
  }

  protected handleError(error: unknown): SearchSettingsResult {
    return { userErrors: searchConfigurationUserErrors(error) };
  }
}

function validateSettingsExpectedVersion(expectedVersion: number): void {
  if (!Number.isInteger(expectedVersion) || expectedVersion <= 0) {
    throw new SearchConfigurationInputError([{
      message: "Expected version must be a positive integer",
      field: ["input", "expectedVersion"],
      code: "INVALID_EXPECTED_VERSION",
    }]);
  }
}

function validateAndNormalizeSettings(
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
    const field = toSearchTextField(configuration.field);
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
    outOfStockPolicy: toSearchOutOfStockPolicy(params.outOfStockPolicy),
  };
}

function toSearchTextField(field: SearchField): SearchTextField {
  switch (field) {
    case "PRODUCT_TITLE":
      return "product_title";
    case "VARIANT_TITLE":
      return "variant_title";
    case "VENDOR_NAME":
      return "vendor_name";
    case "CATEGORY_NAME":
      return "category_name";
  }
  throw new Error(`Unsupported search field: ${field}`);
}

function toSearchOutOfStockPolicy(
  policy: ApiSearchOutOfStockPolicy,
): SearchOutOfStockPolicy {
  switch (policy) {
    case "SHOW":
      return "SHOW";
    case "HIDE":
      return "HIDE";
    case "PLACE_LAST":
      return "PLACE_LAST";
  }
  throw new Error(`Unsupported search out-of-stock policy: ${policy}`);
}
