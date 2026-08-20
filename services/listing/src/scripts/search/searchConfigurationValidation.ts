import type { Catalog } from "@shopana/broker-types";
import type { ServiceBroker } from "@shopana/shared-kernel";
import type { UserError } from "../../kernel/BaseScript.js";
import type {
  SearchProductBoostPhraseInput,
  SearchSynonymValueInput,
} from "../../repositories/search/searchRepositoryTypes.js";
import { SearchQueryNormalizer } from "../../search/normalization/SearchQueryNormalizer.js";

export class SearchConfigurationInputError extends Error {
  constructor(readonly userErrors: readonly UserError[]) {
    super(userErrors[0]?.message ?? "Invalid search configuration input");
    this.name = "SearchConfigurationInputError";
  }
}

export function normalizeSearchLocale(locale: string): string {
  try {
    return new SearchQueryNormalizer().getProfile(locale).locale;
  } catch {
    fail(
      "Search is unavailable for the selected locale",
      ["input", "locale"],
      "LOCALE_UNAVAILABLE",
    );
  }
}

export function normalizeSynonymValues(input: {
  storeId: string;
  locale: string;
  values: readonly string[];
  normalizer?: SearchQueryNormalizer;
}): readonly SearchSynonymValueInput[] {
  if (input.values.length < 2 || input.values.length > 20) {
    fail(
      "A synonym group requires between 2 and 20 values",
      ["input", "values"],
      "SYNONYM_VALUES_REQUIRED",
    );
  }
  const normalizer = input.normalizer ?? new SearchQueryNormalizer();
  const prepared = input.values.map((value, index) => {
    try {
      const normalized = normalizer.normalizeConfigurationValue({
        storeId: input.storeId,
        locale: input.locale,
        value,
      });
      if (normalized.lexemes.length > 8) {
        fail(
          "A synonym value cannot contain more than 8 searchable tokens",
          ["input", "values", String(index)],
          "SYNONYM_VALUE_INVALID",
        );
      }
      return normalized;
    } catch (error) {
      if (error instanceof SearchConfigurationInputError) throw error;
      fail(
        "Synonym value is not searchable for the selected locale",
        ["input", "values", String(index)],
        "SYNONYM_VALUE_INVALID",
      );
    }
  });
  assertUniqueNormalized(
    prepared.map((value) => value.normalizedValue),
    "Synonym values must be unique after normalization",
    ["input", "values"],
    "SYNONYM_CONFLICT",
  );
  return Object.freeze(
    prepared.map((value) =>
      Object.freeze({
        displayValue: value.displayValue,
        normalizedValue: value.normalizedValue,
        preparedText: value.preparedText,
        normalizationContractVersion: value.normalizationContractVersion,
        normalizationProfileRevision: value.normalizationProfileRevision,
      }),
    ),
  );
}

export function normalizeBoostPhrases(input: {
  storeId: string;
  locale: string;
  phrases: readonly string[];
  normalizer?: SearchQueryNormalizer;
}): readonly SearchProductBoostPhraseInput[] {
  if (input.phrases.length < 1 || input.phrases.length > 20) {
    fail(
      "A product boost requires between 1 and 20 phrases",
      ["input", "phrases"],
      "BOOST_PHRASES_REQUIRED",
    );
  }
  const normalizer = input.normalizer ?? new SearchQueryNormalizer();
  const prepared = input.phrases.map((phrase, index) => {
    try {
      return normalizer.normalizeConfigurationValue({
        storeId: input.storeId,
        locale: input.locale,
        value: phrase,
      });
    } catch {
      fail(
        "Boost phrase is not searchable for the selected locale",
        ["input", "phrases", String(index)],
        "BOOST_PHRASE_INVALID",
      );
    }
  });
  assertUniqueNormalized(
    prepared.map((value) => value.normalizedValue),
    "Boost phrases must be unique after normalization",
    ["input", "phrases"],
    "BOOST_PHRASE_INVALID",
  );
  return Object.freeze(
    prepared.map((value) =>
      Object.freeze({
        displayPhrase: value.displayValue,
        normalizedPhrase: value.normalizedValue,
        normalizationContractVersion: value.normalizationContractVersion,
        normalizationProfileRevision: value.normalizationProfileRevision,
      }),
    ),
  );
}

export function validateSearchResourceName(name: string): string {
  const normalized = name.trim();
  if (!normalized || [...normalized].length > 128) {
    fail(
      "Name must contain between 1 and 128 Unicode code points",
      ["input", "name"],
      "INVALID_NAME",
    );
  }
  return normalized;
}

export async function validateCatalogProducts(input: {
  broker: ServiceBroker;
  storeId: string;
  productIds: readonly string[];
}): Promise<void> {
  if (input.productIds.length < 1 || input.productIds.length > 50) {
    fail(
      "A product boost requires between 1 and 50 products",
      ["input", "productIds"],
      "BOOST_PRODUCTS_REQUIRED",
    );
  }
  assertUniqueNormalized(
    input.productIds,
    "Boost products must be unique",
    ["input", "productIds"],
    "BOOST_PRODUCTS_REQUIRED",
  );
  const result = await input.broker.call<Catalog.CatalogQueryResult, Catalog.CatalogQueryParams>(
    "catalog.query",
    {
      storeId: input.storeId,
      selection: {
        populate: {
          products: {
            fieldName: "products",
            args: {
              first: input.productIds.length,
              where: { id: { _in: [...input.productIds] } },
            },
            populate: {
              edges: {
                fieldName: "edges",
                populate: {
                  node: { fields: ["id", "storeId"] },
                },
              },
            },
          },
        },
      },
    },
  );
  if (!result.ok) {
    throw new Error(`Catalog product validation failed: ${result.message}`);
  }
  const found = new Set(
    (result.data.products?.edges ?? [])
      .map((edge) => edge.node)
      .filter((product) => product?.storeId === input.storeId)
      .map((product) => product!.id),
  );
  const missingIndex = input.productIds.findIndex((productId) => !found.has(productId));
  if (missingIndex >= 0) {
    fail(
      "Product was not found in the current store",
      ["input", "productIds", String(missingIndex)],
      "PRODUCT_NOT_FOUND",
    );
  }
}

function assertUniqueNormalized(
  values: readonly string[],
  message: string,
  field: string[],
  code: string,
): void {
  if (new Set(values).size !== values.length) fail(message, field, code);
}

function fail(message: string, field: string[], code: string): never {
  throw new SearchConfigurationInputError([{ message, field, code }]);
}
