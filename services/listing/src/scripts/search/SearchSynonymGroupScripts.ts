import { BaseScript } from "../../kernel/BaseScript.js";
import { searchSynonymsCacheKey } from "../../search/configuration/cacheKeys.js";
import {
  normalizeSynonymValues,
  normalizeSearchLocale,
  SearchConfigurationInputError,
  validateSearchResourceName,
} from "./searchConfigurationValidation.js";
import { searchConfigurationUserErrors } from "./scriptError.js";
import type {
  SearchSynonymGroupCreateParams,
  SearchSynonymGroupDeleteParams,
  SearchSynonymGroupResult,
  SearchSynonymGroupUpdateParams,
} from "./types.js";

export class SearchSynonymGroupCreateScript extends BaseScript<
  SearchSynonymGroupCreateParams,
  SearchSynonymGroupResult
> {
  protected async execute(
    params: SearchSynonymGroupCreateParams,
  ): Promise<SearchSynonymGroupResult> {
    if (!await this.repository.searchSettings.find()) {
      return {
        userErrors: [{
          message: "Search settings are not initialized",
          field: ["input"],
          code: "SETTINGS_NOT_INITIALIZED",
        }],
      };
    }
    const storeId = this.context.store.id;
    const locale = normalizeSearchLocale(params.locale);
    const name = validateSearchResourceName(params.name);
    const values = normalizeSynonymValues({
      storeId,
      locale,
      values: params.values,
    });
    await this.assertClaimsAvailable(locale, params.enabled, values);
    const synonymGroup = await this.repository.searchSynonym.create({
      locale,
      name,
      enabled: params.enabled,
      values,
    });
    return {
      synonymGroup,
      cacheKeys: [searchSynonymsCacheKey(storeId, locale)],
      userErrors: [],
    };
  }

  protected handleError(error: unknown): SearchSynonymGroupResult {
    return { userErrors: searchConfigurationUserErrors(error) };
  }

  private async assertClaimsAvailable(
    locale: string,
    enabled: boolean,
    values: readonly { normalizedValue: string }[],
  ): Promise<void> {
    if (!enabled) return;
    const conflicts = await this.repository.searchSynonym.findClaimConflicts(
      locale,
      values.map((value) => value.normalizedValue),
    );
    if (conflicts.length > 0) {
      throw new SearchConfigurationInputError([{
        message: "Synonym value is already claimed by another active group",
        field: ["input", "values"],
        code: "SYNONYM_CONFLICT",
      }]);
    }
  }
}

export class SearchSynonymGroupUpdateScript extends BaseScript<
  SearchSynonymGroupUpdateParams,
  SearchSynonymGroupResult
> {
  protected async execute(
    params: SearchSynonymGroupUpdateParams,
  ): Promise<SearchSynonymGroupResult> {
    const current = await this.repository.searchSynonym.findById(params.groupId);
    if (!current) {
      return {
        userErrors: [{
          message: "Synonym group not found",
          field: ["input", "id"],
          code: "NOT_FOUND",
        }],
      };
    }
    const storeId = this.context.store.id;
    const locale = normalizeSearchLocale(params.locale);
    const name = validateSearchResourceName(params.name);
    const values = normalizeSynonymValues({
      storeId,
      locale,
      values: params.values,
    });
    if (params.enabled) {
      const conflicts = await this.repository.searchSynonym.findClaimConflicts(
        locale,
        values.map((value) => value.normalizedValue),
        params.groupId,
      );
      if (conflicts.length > 0) {
        throw new SearchConfigurationInputError([{
          message: "Synonym value is already claimed by another active group",
          field: ["input", "values"],
          code: "SYNONYM_CONFLICT",
        }]);
      }
    }
    const result = await this.repository.searchSynonym.update({
      groupId: params.groupId,
      expectedVersion: params.expectedVersion,
      locale,
      name,
      enabled: params.enabled,
      values,
    });
    if (result.status === "not_found") {
      return { userErrors: [{ message: "Synonym group not found", field: ["input", "id"], code: "NOT_FOUND" }] };
    }
    if (result.status === "conflict") {
      return {
        userErrors: [{
          message: `Synonym group version conflict; current version is ${result.currentVersion}`,
          field: ["input", "expectedVersion"],
          code: "VERSION_CONFLICT",
        }],
      };
    }
    return {
      synonymGroup: result.value,
      cacheKeys: [current.group.locale, locale].map((value) =>
        searchSynonymsCacheKey(storeId, value)
      ),
      userErrors: [],
    };
  }

  protected handleError(error: unknown): SearchSynonymGroupResult {
    return { userErrors: searchConfigurationUserErrors(error) };
  }
}

export class SearchSynonymGroupDeleteScript extends BaseScript<
  SearchSynonymGroupDeleteParams,
  SearchSynonymGroupResult
> {
  protected async execute(
    params: SearchSynonymGroupDeleteParams,
  ): Promise<SearchSynonymGroupResult> {
    const current = await this.repository.searchSynonym.findById(params.groupId);
    if (!current) {
      return { userErrors: [{ message: "Synonym group not found", field: ["input", "id"], code: "NOT_FOUND" }] };
    }
    const result = await this.repository.searchSynonym.delete({
      groupId: params.groupId,
      expectedVersion: params.expectedVersion,
    });
    if (result.status === "not_found") {
      return { userErrors: [{ message: "Synonym group not found", field: ["input", "id"], code: "NOT_FOUND" }] };
    }
    if (result.status === "conflict") {
      return {
        userErrors: [{
          message: `Synonym group version conflict; current version is ${result.currentVersion}`,
          field: ["input", "expectedVersion"],
          code: "VERSION_CONFLICT",
        }],
      };
    }
    return {
      synonymGroup: result.value,
      deletedSynonymGroupId: params.groupId,
      cacheKeys: [
        searchSynonymsCacheKey(this.context.store.id, current.group.locale),
      ],
      userErrors: [],
    };
  }

  protected handleError(error: unknown): SearchSynonymGroupResult {
    return { userErrors: searchConfigurationUserErrors(error) };
  }
}
