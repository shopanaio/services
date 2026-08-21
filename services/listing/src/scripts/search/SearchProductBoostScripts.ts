import { BaseScript } from "../../kernel/BaseScript.js";
import { searchProductBoostCacheKey } from "../../search/configuration/cacheKeys.js";
import {
  normalizeBoostPhrases,
  normalizeSearchLocale,
  validateCatalogProducts,
  validateSearchResourceName,
} from "./searchConfigurationValidation.js";
import { searchConfigurationUserErrors } from "./scriptError.js";
import type {
  SearchProductBoostCreateParams,
  SearchProductBoostDeleteParams,
  SearchProductBoostResult,
  SearchProductBoostUpdateParams,
} from "./types.js";

export class SearchProductBoostCreateScript extends BaseScript<
  SearchProductBoostCreateParams,
  SearchProductBoostResult
> {
  protected async execute(
    params: SearchProductBoostCreateParams,
  ): Promise<SearchProductBoostResult> {
    if (!(await this.repository.searchSettings.find())) {
      return {
        userErrors: [
          {
            message: "Search settings are not initialized",
            field: ["input"],
            code: "SETTINGS_NOT_INITIALIZED",
          },
        ],
      };
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
    const productBoost = await this.repository.searchProductBoost.create({
      locale,
      name,
      enabled: params.enabled,
      phrases,
      productIds: params.productIds,
    });
    return {
      productBoost,
      cacheKeys: [searchProductBoostCacheKey(storeId, locale, productBoost.boost.boostId)],
      userErrors: [],
    };
  }

  protected handleError(error: unknown): SearchProductBoostResult {
    return { userErrors: searchConfigurationUserErrors(error) };
  }
}

export class SearchProductBoostUpdateScript extends BaseScript<
  SearchProductBoostUpdateParams,
  SearchProductBoostResult
> {
  protected async execute(
    params: SearchProductBoostUpdateParams,
  ): Promise<SearchProductBoostResult> {
    const current = await this.repository.searchProductBoost.findById(params.boostId);
    if (!current) {
      return {
        userErrors: [
          { message: "Product boost not found", field: ["input", "id"], code: "NOT_FOUND" },
        ],
      };
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

      locale,
      name,
      enabled: params.enabled,
      phrases,
      productIds: params.productIds,
    });
    if (result.status === "not_found") {
      return {
        userErrors: [
          { message: "Product boost not found", field: ["input", "id"], code: "NOT_FOUND" },
        ],
      };
    }
    return {
      productBoost: result.value,
      cacheKeys: [current.boost.locale, locale].map((value) =>
        searchProductBoostCacheKey(storeId, value, params.boostId),
      ),
      userErrors: [],
    };
  }

  protected handleError(error: unknown): SearchProductBoostResult {
    return { userErrors: searchConfigurationUserErrors(error) };
  }
}

export class SearchProductBoostDeleteScript extends BaseScript<
  SearchProductBoostDeleteParams,
  SearchProductBoostResult
> {
  protected async execute(
    params: SearchProductBoostDeleteParams,
  ): Promise<SearchProductBoostResult> {
    const current = await this.repository.searchProductBoost.findById(params.boostId);
    if (!current) {
      return {
        userErrors: [
          { message: "Product boost not found", field: ["input", "id"], code: "NOT_FOUND" },
        ],
      };
    }
    const result = await this.repository.searchProductBoost.delete({
      boostId: params.boostId,
    });
    if (result.status === "not_found") {
      return {
        userErrors: [
          { message: "Product boost not found", field: ["input", "id"], code: "NOT_FOUND" },
        ],
      };
    }
    return {
      productBoost: result.value,
      deletedProductBoostId: params.boostId,
      cacheKeys: [
        searchProductBoostCacheKey(this.context.store.id, current.boost.locale, params.boostId),
      ],
      userErrors: [],
    };
  }

  protected handleError(error: unknown): SearchProductBoostResult {
    return { userErrors: searchConfigurationUserErrors(error) };
  }
}
