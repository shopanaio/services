import { Policy } from "@shopana/shared-kernel";
import { BaseScript } from "../../kernel/BaseScript.js";
import { searchProductBoostCacheKey } from "../../search/configuration/cacheKeys.js";
import {
  normalizeBoostPhrases,
  normalizeSearchLocale,
  validateCatalogProducts,
  validateExpectedVersion,
  validateSearchResourceName,
} from "./searchConfigurationValidation.js";
import { searchConfigurationUserErrors } from "./scriptError.js";
import { invalidateSearchCacheAfterCommit } from "./cacheInvalidation.js";
import type {
  SearchProductBoostCreateParams,
  SearchProductBoostDeleteParams,
  SearchProductBoostResult,
  SearchProductBoostUpdateParams,
} from "./types.js";

const POLICY = {
  resource: "store.search",
  action: "admin",
} as const;

export class SearchProductBoostCreateScript extends BaseScript<
  SearchProductBoostCreateParams,
  SearchProductBoostResult
> {
  @Policy<SearchProductBoostCreateParams>(POLICY)
  protected async execute(
    params: SearchProductBoostCreateParams,
  ): Promise<SearchProductBoostResult> {
    const storeId = this.context.store.id;
    const locale = normalizeSearchLocale(params.locale);
    const name = validateSearchResourceName(params.name);
    const phrases = normalizeBoostPhrases({
      storeId,
      locale,
      phrases: params.phrases,
    });
    await validateCatalogProducts({
      broker: this.services.broker,
      storeId,
      productIds: params.productIds,
    });
    const productBoost = await this.repository.searchProductBoost.create({
      locale,
      name,
      enabled: params.enabled,
      phrases,
      productIds: params.productIds,
      actorId: this.currentUser.id,
      requestId: this.context.requestId,
    });
    await invalidateSearchCacheAfterCommit({
      cache: this.services.cache,
      logger: this.logger,
      storeId,
      resourceType: "product_boost",
      resourceId: productBoost.boost.boostId,
      keys: [
        searchProductBoostCacheKey(
          storeId,
          locale,
          productBoost.boost.boostId,
        ),
      ],
    });
    return { productBoost, userErrors: [] };
  }

  protected handleError(error: unknown): SearchProductBoostResult {
    return { userErrors: searchConfigurationUserErrors(error) };
  }
}

export class SearchProductBoostUpdateScript extends BaseScript<
  SearchProductBoostUpdateParams,
  SearchProductBoostResult
> {
  @Policy<SearchProductBoostUpdateParams>(POLICY)
  protected async execute(
    params: SearchProductBoostUpdateParams,
  ): Promise<SearchProductBoostResult> {
    validateExpectedVersion(params.expectedVersion);
    const current = await this.repository.searchProductBoost.findById(params.boostId);
    if (!current) {
      return { userErrors: [{ message: "Product boost not found", field: ["input", "id"], code: "NOT_FOUND" }] };
    }
    const storeId = this.context.store.id;
    const locale = normalizeSearchLocale(params.locale);
    const name = validateSearchResourceName(params.name);
    const phrases = normalizeBoostPhrases({
      storeId,
      locale,
      phrases: params.phrases,
    });
    await validateCatalogProducts({
      broker: this.services.broker,
      storeId,
      productIds: params.productIds,
    });
    const result = await this.repository.searchProductBoost.update({
      boostId: params.boostId,
      expectedVersion: params.expectedVersion,
      locale,
      name,
      enabled: params.enabled,
      phrases,
      productIds: params.productIds,
      actorId: this.currentUser.id,
      requestId: this.context.requestId,
    });
    if (result.status === "conflict") {
      return { userErrors: [{ message: `Product boost version conflict; current version is ${result.currentVersion}`, field: ["input", "expectedVersion"], code: "CONFIGURATION_CONFLICT" }] };
    }
    if (result.status === "not_found") {
      return { userErrors: [{ message: "Product boost not found", field: ["input", "id"], code: "NOT_FOUND" }] };
    }
    await invalidateSearchCacheAfterCommit({
      cache: this.services.cache,
      logger: this.logger,
      storeId,
      resourceType: "product_boost",
      resourceId: params.boostId,
      keys: [current.boost.locale, locale].map((value) =>
        searchProductBoostCacheKey(storeId, value, params.boostId)
      ),
    });
    return { productBoost: result.value, userErrors: [] };
  }

  protected handleError(error: unknown): SearchProductBoostResult {
    return { userErrors: searchConfigurationUserErrors(error) };
  }
}

export class SearchProductBoostDeleteScript extends BaseScript<
  SearchProductBoostDeleteParams,
  SearchProductBoostResult
> {
  @Policy<SearchProductBoostDeleteParams>(POLICY)
  protected async execute(
    params: SearchProductBoostDeleteParams,
  ): Promise<SearchProductBoostResult> {
    validateExpectedVersion(params.expectedVersion);
    const current = await this.repository.searchProductBoost.findById(params.boostId);
    if (!current) {
      return { userErrors: [{ message: "Product boost not found", field: ["input", "id"], code: "NOT_FOUND" }] };
    }
    const result = await this.repository.searchProductBoost.delete({
      boostId: params.boostId,
      expectedVersion: params.expectedVersion,
      actorId: this.currentUser.id,
      requestId: this.context.requestId,
    });
    if (result.status === "conflict") {
      return { userErrors: [{ message: `Product boost version conflict; current version is ${result.currentVersion}`, field: ["input", "expectedVersion"], code: "CONFIGURATION_CONFLICT" }] };
    }
    if (result.status === "not_found") {
      return { userErrors: [{ message: "Product boost not found", field: ["input", "id"], code: "NOT_FOUND" }] };
    }
    await invalidateSearchCacheAfterCommit({
      cache: this.services.cache,
      logger: this.logger,
      storeId: this.context.store.id,
      resourceType: "product_boost",
      resourceId: params.boostId,
      keys: [
        searchProductBoostCacheKey(
          this.context.store.id,
          current.boost.locale,
          params.boostId,
        ),
      ],
    });
    return {
      productBoost: result.value,
      deletedProductBoostId: params.boostId,
      userErrors: [],
    };
  }

  protected handleError(error: unknown): SearchProductBoostResult {
    return { userErrors: searchConfigurationUserErrors(error) };
  }
}
