import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type {
  SearchProductBoostListView,
  SearchSynonymGroupListView,
} from "../../repositories/models/index.js";
import type {
  SearchProductBoostAggregate,
  SearchSynonymGroupAggregate,
} from "../../repositories/search/searchRepositoryTypes.js";

export function mapSearchSynonymGroupAggregate(
  aggregate: SearchSynonymGroupAggregate,
) {
  return {
    id: encodeSearchSynonymGroupId(aggregate.group.groupId),
    locale: aggregate.group.locale,
    name: aggregate.group.name,
    enabled: aggregate.group.enabled,
    version: aggregate.group.version,
    createdAt: aggregate.group.createdAt,
    updatedAt: aggregate.group.updatedAt,
    values: aggregate.values.map((value) => ({
      value: value.displayValue,
      position: value.position,
    })),
    valuesCount: aggregate.values.length,
  };
}

export function mapSearchSynonymGroupListView(
  row: SearchSynonymGroupListView,
) {
  return {
    id: encodeSearchSynonymGroupId(row.id),
    locale: row.locale,
    name: row.name,
    enabled: row.enabled,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    values: row.valueItems,
    valuesCount: row.valuesCount,
  };
}

export function mapSearchProductBoostAggregate(
  aggregate: SearchProductBoostAggregate,
) {
  return {
    id: encodeSearchProductBoostId(aggregate.boost.boostId),
    locale: aggregate.boost.locale,
    name: aggregate.boost.name,
    enabled: aggregate.boost.enabled,
    version: aggregate.boost.version,
    createdAt: aggregate.boost.createdAt,
    updatedAt: aggregate.boost.updatedAt,
    phrases: aggregate.phrases.map((phrase) => ({
      phrase: phrase.displayPhrase,
      position: phrase.position,
    })),
    phrasesCount: aggregate.phrases.length,
    products: toProductReferences(
      aggregate.products.map((product) => product.productId),
    ),
    productsCount: aggregate.products.length,
  };
}

export function mapSearchProductBoostListView(
  row: SearchProductBoostListView,
) {
  return {
    id: encodeSearchProductBoostId(row.id),
    locale: row.locale,
    name: row.name,
    enabled: row.enabled,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    phrases: row.phraseItems,
    phrasesCount: row.phrasesCount,
    products: toProductReferences(row.productIds),
    productsCount: row.productsCount,
  };
}

function encodeSearchSynonymGroupId(id: string): string {
  return encodeGlobalIdByType(id, GlobalIdEntity.SearchSynonymGroup);
}

function encodeSearchProductBoostId(id: string): string {
  return encodeGlobalIdByType(id, GlobalIdEntity.SearchProductBoost);
}

function toProductReferences(ids: readonly string[]) {
  return ids.map((id) => ({
    __typename: "Product" as const,
    id: encodeGlobalIdByType(id, GlobalIdEntity.Product),
  }));
}
