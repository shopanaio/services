import {
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import { Policy } from "@shopana/shared-kernel";
import { GraphQLError } from "graphql";
import type { ZodIssue } from "zod";
import { SearchRuntimeError } from "../../search/errors.js";
import type {
  SearchSettings as SearchSettingsModel,
} from "../../repositories/models/index.js";
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
  SearchSettingsCreateScript,
  SearchSettingsUpdateScript,
} from "../../scripts/search/index.js";
import { SearchFieldRegistry } from "../../search/planner/SearchFieldRegistry.js";
import {
  SearchSettingsCreateInputSchema,
  SearchSettingsUpdateInputSchema,
} from "./generated/schemas.js";
import {
  SearchField,
  SearchOutOfStockPolicy,
  type SearchSettings as ApiSearchSettings,
  type SearchSettingsCreateInput,
  type SearchSettingsUpdateInput,
} from "./generated/types.js";
import { ListingType } from "./ListingType.js";

const READ_POLICY = {
  resource: "store.search",
  action: "read",
} as const;

const searchFieldRegistry = new SearchFieldRegistry();

export class ListingSearchQueryResolver extends ListingType<Record<string, never>> {
  async settings(): Promise<ApiSearchSettings | null> {
    const settings = await this.$ctx.kernel.repository.searchSettings.find();
    return settings ? mapSearchSettings(settings) : null;
  }

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
      enabledFields: explain.settings.enabledFields.map(mapSearchField),
      fieldWeights: explain.settings.fieldWeights.map((fieldWeight) => ({
        field: mapSearchField(fieldWeight.field),
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
    fields: clause.fields.map(mapSearchField),
    synonymGroupId: clause.synonymGroupId
      ? encodeGlobalIdByType(
          clause.synonymGroupId,
          GlobalIdEntity.SearchSynonymGroup,
        )
      : null,
    alternatives: clause.alternatives.map(mapSearchExplainClause),
  };
}

function mapSearchField(field: SearchTextField): SearchField {
  switch (field) {
    case "product_title":
      return SearchField.ProductTitle;
    case "variant_title":
      return SearchField.VariantTitle;
    case "vendor_name":
      return SearchField.VendorName;
    case "category_name":
      return SearchField.CategoryName;
  }
}

export class ListingSearchMutationResolver extends ListingType<Record<string, never>> {
  async settingsCreate(args: { input: SearchSettingsCreateInput }) {
    const parsed = SearchSettingsCreateInputSchema().safeParse(args.input);
    if (!parsed.success) return invalidSettingsInputPayload(parsed.error.issues);

    const result = await this.$ctx.kernel.runScript(
      SearchSettingsCreateScript,
      parsed.data,
    );
    return mapSearchSettingsPayload(result);
  }

  async settingsUpdate(args: { input: SearchSettingsUpdateInput }) {
    const parsed = SearchSettingsUpdateInputSchema().safeParse(args.input);
    if (!parsed.success) return invalidSettingsInputPayload(parsed.error.issues);

    const result = await this.$ctx.kernel.runScript(
      SearchSettingsUpdateScript,
      parsed.data,
    );
    return mapSearchSettingsPayload(result);
  }

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

function mapSearchSettings(settings: SearchSettingsModel): ApiSearchSettings {
  if (!Array.isArray(settings.enabledFields)) {
    throw new Error("Search settings enabled fields are invalid");
  }
  if (!settings.fieldWeights || typeof settings.fieldWeights !== "object") {
    throw new Error("Search settings field weights are invalid");
  }

  const enabledFields = searchFieldRegistry.normalizeEnabledFields(
    settings.enabledFields as SearchTextField[],
  );
  const weights = settings.fieldWeights as Partial<
    Record<SearchTextField, unknown>
  >;
  const fields = enabledFields.map((field) => {
    const weight = weights[field];
    if (
      typeof weight !== "number" ||
      !Number.isFinite(weight) ||
      weight <= 0 ||
      weight > 100
    ) {
      throw new Error(`Search settings weight is invalid for ${field}`);
    }
    return { field: mapSearchField(field), weight };
  });

  return {
    version: settings.version,
    fields,
    typoToleranceEnabled: settings.typoToleranceEnabled,
    outOfStockPolicy: mapSearchOutOfStockPolicy(settings.outOfStockPolicy),
    updatedAt: settings.updatedAt,
    updatedById: encodeGlobalIdByType(
      settings.updatedBy,
      GlobalIdEntity.User,
    ),
  };
}

function mapSearchOutOfStockPolicy(value: string): SearchOutOfStockPolicy {
  switch (value) {
    case "SHOW":
      return SearchOutOfStockPolicy.Show;
    case "HIDE":
      return SearchOutOfStockPolicy.Hide;
    case "PLACE_LAST":
      return SearchOutOfStockPolicy.PlaceLast;
    default:
      throw new Error(`Search out-of-stock policy is invalid: ${value}`);
  }
}

function mapSearchSettingsPayload(result: {
  settings?: SearchSettingsModel;
  currentVersion?: number;
  userErrors: Array<{
    message: string;
    field?: string[];
    code?: string;
  }>;
}) {
  return {
    settings: result.settings ? mapSearchSettings(result.settings) : null,
    currentVersion: result.currentVersion ?? null,
    userErrors: result.userErrors,
  };
}

function invalidSettingsInputPayload(issues: readonly ZodIssue[]) {
  return {
    settings: null,
    currentVersion: null,
    userErrors: issues.map((issue) => ({
      message: issue.message,
      field: ["input", ...issue.path.map(String)],
      code: issue.code,
    })),
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
