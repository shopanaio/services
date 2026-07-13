import {
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import { Policy } from "@shopana/shared-kernel";
import { GraphQLError } from "graphql";
import { SearchRuntimeError } from "../../search/errors.js";
import type {
  SearchProductBoostAggregate,
  SearchSynonymGroupAggregate,
  SearchTextField,
} from "../../repositories/search/searchRepositoryTypes.js";
import type {
  SearchExplain,
  SearchExplainClause,
} from "../../search/execution/SearchExplain.js";
import {
  SearchProductBoostCreateScript,
  SearchProductBoostDeleteScript,
  SearchProductBoostUpdateScript,
  SearchSynonymGroupCreateScript,
  SearchSynonymGroupDeleteScript,
  SearchSynonymGroupUpdateScript,
} from "../../scripts/search/index.js";
import { ListingType } from "./ListingType.js";

const READ_POLICY = {
  resource: "store.search",
  action: "read",
} as const;

export class ListingSearchQueryResolver extends ListingType<Record<string, never>> {
  @Policy(READ_POLICY)
  async synonymGroup(args: { id: string }) {
    const groupId = safeDecode(args.id, GlobalIdEntity.SearchSynonymGroup);
    if (!groupId) return null;
    const aggregate = await this.$ctx.kernel.repository.searchSynonym.findById(
      groupId,
    );
    return aggregate ? mapSynonymGroup(aggregate) : null;
  }

  @Policy(READ_POLICY)
  async synonymGroups(args: {
    locale?: string | null;
    limit?: number | null;
    offset?: number | null;
  }) {
    const page = await this.$ctx.kernel.repository.searchSynonym.listPage({
      locale: args.locale ?? undefined,
      limit: args.limit ?? 20,
      offset: args.offset ?? 0,
    });
    return {
      nodes: page.nodes.map(mapSynonymGroup),
      totalCount: page.totalCount,
    };
  }

  @Policy(READ_POLICY)
  async productBoost(args: { id: string }) {
    const boostId = safeDecode(args.id, GlobalIdEntity.SearchProductBoost);
    if (!boostId) return null;
    const aggregate = await this.$ctx.kernel.repository.searchProductBoost.findById(
      boostId,
    );
    return aggregate ? mapProductBoost(aggregate) : null;
  }

  @Policy(READ_POLICY)
  async productBoosts(args: {
    locale?: string | null;
    limit?: number | null;
    offset?: number | null;
  }) {
    const page = await this.$ctx.kernel.repository.searchProductBoost.listPage({
      locale: args.locale ?? undefined,
      limit: args.limit ?? 20,
      offset: args.offset ?? 0,
    });
    return {
      nodes: page.nodes.map(mapProductBoost),
      totalCount: page.totalCount,
    };
  }

  @Policy(READ_POLICY)
  async explain(args: { query: string; locale: string }) {
    return this.resolveExplain(args);
  }

  private async resolveExplain(args: { query: string; locale: string }) {
    try {
      const explain = await this.$ctx.kernel.searchExecution.explain({
        query: args.query,
        locale: args.locale,
      });
      return mapSearchExplain(explain);
    } catch (error) {
      if (error instanceof SearchRuntimeError) {
        const message = error.code === "SEARCH_INDEX_UNAVAILABLE"
          ? "Search index is unavailable"
          : error.message;
        throw new GraphQLError(message, {
          extensions: { code: error.code },
        });
      }
      throw new GraphQLError(
        "Search explain is unavailable",
        { extensions: { code: "SEARCH_INDEX_UNAVAILABLE" } },
      );
    }
  }
}

function mapSearchExplain(explain: SearchExplain) {
  return {
    ...explain,
    units: explain.units.map((unit) => ({
      ...unit,
      clauses: unit.clauses.map(mapSearchExplainClause),
    })),
    wholeQueryClauses: explain.wholeQueryClauses.map(mapSearchExplainClause),
    settings: {
      ...explain.settings,
      enabledFields: explain.settings.enabledFields.map(mapSearchExplainField),
      fieldWeights: explain.settings.fieldWeights.map((fieldWeight) => ({
        field: mapSearchExplainField(fieldWeight.field),
        weight: fieldWeight.weight,
      })),
    },
    matchedSynonymGroupIds: explain.matchedSynonymGroupIds.map((id) =>
      encodeGlobalIdByType(id, GlobalIdEntity.SearchSynonymGroup)
    ),
    applicableProductBoostIds: explain.applicableProductBoostIds.map((id) =>
      encodeGlobalIdByType(id, GlobalIdEntity.SearchProductBoost)
    ),
  };
}

function mapSearchExplainClause(clause: SearchExplainClause): object {
  return {
    ...clause,
    fields: clause.fields.map(mapSearchExplainField),
    synonymGroupId: clause.synonymGroupId
      ? encodeGlobalIdByType(
          clause.synonymGroupId,
          GlobalIdEntity.SearchSynonymGroup,
        )
      : null,
    alternatives: clause.alternatives.map(mapSearchExplainClause),
  };
}

function mapSearchExplainField(field: SearchTextField): string {
  switch (field) {
    case "product_title":
      return "PRODUCT_TITLE";
    case "variant_title":
      return "VARIANT_TITLE";
    case "vendor_name":
      return "VENDOR_NAME";
    case "category_name":
      return "CATEGORY_NAME";
  }
}

export class ListingSearchMutationResolver extends ListingType<Record<string, never>> {
  async synonymGroupCreate(args: {
    input: {
      locale: string;
      name: string;
      enabled?: boolean | null;
      values: string[];
    };
  }) {
    const result = await this.$ctx.kernel.runScript(
      SearchSynonymGroupCreateScript,
      {
        locale: args.input.locale,
        name: args.input.name,
        enabled: args.input.enabled ?? true,
        values: args.input.values,
      },
    );
    return {
      synonymGroup: result.synonymGroup
        ? mapSynonymGroup(result.synonymGroup)
        : null,
      userErrors: result.userErrors,
    };
  }

  async synonymGroupUpdate(args: {
    input: {
      id: string;
      expectedVersion: number;
      locale: string;
      name: string;
      enabled: boolean;
      values: string[];
    };
  }) {
    const groupId = safeDecode(
      args.input.id,
      GlobalIdEntity.SearchSynonymGroup,
    );
    if (!groupId) return invalidIdPayload("synonymGroup");
    const result = await this.$ctx.kernel.runScript(
      SearchSynonymGroupUpdateScript,
      { ...args.input, groupId },
    );
    return {
      synonymGroup: result.synonymGroup
        ? mapSynonymGroup(result.synonymGroup)
        : null,
      userErrors: result.userErrors,
    };
  }

  async synonymGroupDelete(args: {
    input: { id: string; expectedVersion: number };
  }) {
    const groupId = safeDecode(
      args.input.id,
      GlobalIdEntity.SearchSynonymGroup,
    );
    if (!groupId) return invalidDeleteIdPayload("deletedSynonymGroupId");
    const result = await this.$ctx.kernel.runScript(
      SearchSynonymGroupDeleteScript,
      { groupId, expectedVersion: args.input.expectedVersion },
    );
    return {
      deletedSynonymGroupId: result.deletedSynonymGroupId
        ? encodeGlobalIdByType(
            result.deletedSynonymGroupId,
            GlobalIdEntity.SearchSynonymGroup,
          )
        : null,
      userErrors: result.userErrors,
    };
  }

  async productBoostCreate(args: {
    input: {
      locale: string;
      name: string;
      enabled?: boolean | null;
      phrases: string[];
      productIds: string[];
    };
  }) {
    const decoded = decodeProductIds(args.input.productIds);
    if (decoded.userErrors.length > 0) {
      return { productBoost: null, userErrors: decoded.userErrors };
    }
    const result = await this.$ctx.kernel.runScript(
      SearchProductBoostCreateScript,
      {
        locale: args.input.locale,
        name: args.input.name,
        enabled: args.input.enabled ?? true,
        phrases: args.input.phrases,
        productIds: decoded.ids,
      },
    );
    return {
      productBoost: result.productBoost
        ? mapProductBoost(result.productBoost)
        : null,
      userErrors: result.userErrors,
    };
  }

  async productBoostUpdate(args: {
    input: {
      id: string;
      expectedVersion: number;
      locale: string;
      name: string;
      enabled: boolean;
      phrases: string[];
      productIds: string[];
    };
  }) {
    const boostId = safeDecode(args.input.id, GlobalIdEntity.SearchProductBoost);
    if (!boostId) return invalidIdPayload("productBoost");
    const decoded = decodeProductIds(args.input.productIds);
    if (decoded.userErrors.length > 0) {
      return { productBoost: null, userErrors: decoded.userErrors };
    }
    const result = await this.$ctx.kernel.runScript(
      SearchProductBoostUpdateScript,
      { ...args.input, boostId, productIds: decoded.ids },
    );
    return {
      productBoost: result.productBoost
        ? mapProductBoost(result.productBoost)
        : null,
      userErrors: result.userErrors,
    };
  }

  async productBoostDelete(args: {
    input: { id: string; expectedVersion: number };
  }) {
    const boostId = safeDecode(args.input.id, GlobalIdEntity.SearchProductBoost);
    if (!boostId) return invalidDeleteIdPayload("deletedProductBoostId");
    const result = await this.$ctx.kernel.runScript(
      SearchProductBoostDeleteScript,
      { boostId, expectedVersion: args.input.expectedVersion },
    );
    return {
      deletedProductBoostId: result.deletedProductBoostId
        ? encodeGlobalIdByType(
            result.deletedProductBoostId,
            GlobalIdEntity.SearchProductBoost,
          )
        : null,
      userErrors: result.userErrors,
    };
  }
}

function mapSynonymGroup(aggregate: SearchSynonymGroupAggregate) {
  return {
    id: encodeGlobalIdByType(
      aggregate.group.groupId,
      GlobalIdEntity.SearchSynonymGroup,
    ),
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
  };
}

function mapProductBoost(aggregate: SearchProductBoostAggregate) {
  return {
    id: encodeGlobalIdByType(
      aggregate.boost.boostId,
      GlobalIdEntity.SearchProductBoost,
    ),
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
    productIds: aggregate.products.map((product) =>
      encodeGlobalIdByType(product.productId, GlobalIdEntity.Product)
    ),
  };
}

function safeDecode(id: string, type: GlobalIdType): string | null {
  try {
    return decodeGlobalIdByType(id, type);
  } catch {
    return null;
  }
}

function decodeProductIds(ids: readonly string[]) {
  const decoded: string[] = [];
  const userErrors: Array<{ message: string; field: string[]; code: string }> = [];
  ids.forEach((id, index) => {
    const productId = safeDecode(id, GlobalIdEntity.Product);
    if (productId) decoded.push(productId);
    else userErrors.push({
      message: "Invalid product ID",
      field: ["input", "productIds", String(index)],
      code: "INVALID_ID",
    });
  });
  return { ids: decoded, userErrors };
}

function invalidIdPayload(field: string) {
  return {
    [field]: null,
    userErrors: [{
      message: "Invalid ID",
      field: ["input", "id"],
      code: "INVALID_ID",
    }],
  };
}

function invalidDeleteIdPayload(field: string) {
  return {
    [field]: null,
    userErrors: [{
      message: "Invalid ID",
      field: ["input", "id"],
      code: "INVALID_ID",
    }],
  };
}
