import {
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import { hashContent } from "@shopana/shared-kernel";
import { GraphQLError } from "graphql";
import type { UserError } from "../../kernel/BaseScript.js";
import { SearchRuntimeError } from "../../search/errors.js";
import type {
  SearchSettings as SearchSettingsModel,
} from "../../repositories/models/index.js";
import type { SearchTextField } from "../../repositories/search/searchRepositoryTypes.js";
import type { SearchProductBoostRelayInput } from "../../repositories/search/SearchProductBoostRepository.js";
import type { SearchSynonymGroupRelayInput } from "../../repositories/search/SearchSynonymRepository.js";
import type {
  SearchExplain,
  SearchExplainClause,
} from "../../search/execution/SearchExplain.js";
import { SearchFieldRegistry } from "../../search/planner/SearchFieldRegistry.js";
import type {
  SearchProductBoostCreateWorkflowInput,
  SearchProductBoostDeleteWorkflowInput,
  SearchProductBoostMutationWorkflowResult,
  SearchProductBoostUpdateWorkflowInput,
  SearchSynonymGroupCreateWorkflowInput,
  SearchSynonymGroupDeleteWorkflowInput,
  SearchSynonymGroupMutationWorkflowResult,
  SearchSynonymGroupUpdateWorkflowInput,
} from "../../workflows/dto/SearchResourceMutationWorkflowDto.js";
import type {
  SearchSettingsUpdateWorkflowInput,
  SearchSettingsUpdateWorkflowResult,
} from "../../workflows/dto/SearchSettingsUpdateWorkflowDto.js";
import {
  SearchField,
  SearchOutOfStockPolicy,
  SearchSettingsOperationType,
  type SearchSettings as ApiSearchSettings,
  type ListingSearchMutationSettingsUpdateArgs,
  type ListingSearchMutationProductBoostCreateArgs,
  type ListingSearchMutationProductBoostDeleteArgs,
  type ListingSearchMutationProductBoostUpdateArgs,
  type ListingSearchMutationSynonymGroupCreateArgs,
  type ListingSearchMutationSynonymGroupDeleteArgs,
  type ListingSearchMutationSynonymGroupUpdateArgs,
} from "./generated/types.js";
import { ListingType } from "./ListingType.js";
import {
  mapSearchProductBoostAggregate,
  mapSearchSynonymGroupAggregate,
} from "./searchConfigurationMapper.js";

const searchFieldRegistry = new SearchFieldRegistry();

export class ListingSearchQueryResolver extends ListingType<Record<string, never>> {
  async settings(): Promise<ApiSearchSettings | null> {
    const settings = await this.$ctx.kernel.repository.searchSettings.find();
    return settings ? mapSearchSettings(settings) : null;
  }

  async synonymGroup(args: { id: string }) {
    const groupId = safeDecode(args.id, GlobalIdEntity.SearchSynonymGroup);
    if (!groupId) return null;
    const aggregate = await this.$ctx.kernel.repository.searchSynonym.findById(
      groupId,
    );
    return aggregate ? mapSearchSynonymGroupAggregate(aggregate) : null;
  }

  async synonymGroups(args: SearchSynonymGroupRelayInput) {
    return this.resolvers.searchSynonymGroupConnection(args);
  }

  async productBoost(args: { id: string }) {
    const boostId = safeDecode(args.id, GlobalIdEntity.SearchProductBoost);
    if (!boostId) return null;
    const aggregate = await this.$ctx.kernel.repository.searchProductBoost.findById(
      boostId,
    );
    return aggregate ? mapSearchProductBoostAggregate(aggregate) : null;
  }

  async productBoosts(
    args: SearchProductBoostRelayInput & {
      meta?: { productIds: readonly string[] } | null;
    },
  ) {
    const { meta, ...input } = args;
    const productIds = meta?.productIds.map((id, index) => {
      const decoded = safeDecode(id, GlobalIdEntity.Product);
      if (!decoded) {
        throw new GraphQLError("Invalid Product global ID", {
          extensions: {
            code: "BAD_USER_INPUT",
            field: ["meta", "productIds", String(index)],
          },
        });
      }
      return decoded;
    });

    return this.resolvers.searchProductBoostConnection({
      ...input,
      ...(meta ? { productIds: productIds ?? [] } : {}),
    });
  }

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
  async settingsUpdate(args: ListingSearchMutationSettingsUpdateArgs) {
    if (!Number.isInteger(args.expectedVersion) || args.expectedVersion < 0) {
      const userErrors = [{
        message: "Expected version must be a non-negative integer",
        field: ["expectedVersion"],
        code: "INVALID_EXPECTED_VERSION",
      }];
      return {
        settings: null,
        operationResults: [],
        userErrors,
      };
    }

    const settings = args.operations.settings;
    const workflowInput: SearchSettingsUpdateWorkflowInput = {
      expectedVersion: args.expectedVersion,
      settings: {
        fields: settings.fields.map((configuration) => ({
          field: toInternalSearchField(configuration.field),
          weight: configuration.weight,
        })),
        typoToleranceEnabled: settings.typoToleranceEnabled,
        outOfStockPolicy: toInternalOutOfStockPolicy(
          settings.outOfStockPolicy,
        ),
      },
      context: this.searchWorkflowContext(),
    };
    const payloadHash = hashContent({
      v: 1,
      expectedVersion: args.expectedVersion,
      settings: workflowInput.settings,
    });
    const result = await this.$ctx.kernel.getServices().broker.runWorkflow<
      SearchSettingsUpdateWorkflowResult,
      SearchSettingsUpdateWorkflowInput
    >(
      "listing.searchSettingsUpdate",
      workflowInput,
      {
        source: "workflow",
        organizationId: this.$ctx.store.organizationId,
        workflowId:
          `searchSettingsUpdate:${this.$ctx.store.id}:${this.$ctx.requestId}`,
        stepId: "start",
        callId: payloadHash,
      },
      { adminContext: this.$ctx.adminContext },
    );

    const currentSettings = result.settings
      ? await this.$ctx.kernel.repository.searchSettings.find()
      : null;
    return {
      settings: result.settings && currentSettings
        ? {
            ...mapSearchSettings(currentSettings),
            version: result.settings.version,
          }
        : null,
      operationResults: result.operationResults.map((operationResult) => ({
        ...operationResult,
        type: SearchSettingsOperationType.SettingsUpdate,
      })),
      userErrors: result.userErrors,
    };
  }

  async synonymGroupCreate(
    args: ListingSearchMutationSynonymGroupCreateArgs,
  ) {
    if (!args.input.clientMutationId.trim()) {
      return resourceMutationError("Client mutation ID is required", [
        "input",
        "clientMutationId",
      ], "REQUIRED", "synonymGroup");
    }

    const workflowInput: SearchSynonymGroupCreateWorkflowInput = {
      params: {
        clientMutationId: args.input.clientMutationId,
        locale: args.input.locale,
        name: args.input.name,
        enabled: args.input.enabled,
        values: args.input.values,
      },
      context: this.searchWorkflowContext(),
    };
    const result = await this.$ctx.kernel.getServices().broker.runWorkflow<
      SearchSynonymGroupMutationWorkflowResult,
      SearchSynonymGroupCreateWorkflowInput
    >(
      "listing.searchSynonymGroupCreate",
      workflowInput,
      {
        source: "workflow",
        organizationId: this.$ctx.store.organizationId,
        workflowId:
          `searchSynonymGroupCreate:${this.$ctx.store.id}:${this.$ctx.requestId}`,
        stepId: "start",
        callId: hashContent({ v: 1, params: workflowInput.params }),
      },
      { adminContext: this.$ctx.adminContext },
    );
    return {
      synonymGroup: result.synonymGroup
        ? mapSearchSynonymGroupAggregate(result.synonymGroup)
        : null,
      userErrors: result.userErrors,
    };
  }

  async synonymGroupUpdate(
    args: ListingSearchMutationSynonymGroupUpdateArgs,
  ) {
    const groupId = safeDecode(
      args.input.id,
      GlobalIdEntity.SearchSynonymGroup,
    );
    if (!groupId) {
      return resourceMutationError(
        "Invalid search synonym group global ID",
        ["input", "id"],
        "INVALID_ID",
        "synonymGroup",
      );
    }
    if (!Number.isInteger(args.input.expectedVersion) || args.input.expectedVersion <= 0) {
      return resourceMutationError(
        "Expected version must be a positive integer",
        ["input", "expectedVersion"],
        "INVALID_EXPECTED_VERSION",
        "synonymGroup",
      );
    }

    const workflowInput: SearchSynonymGroupUpdateWorkflowInput = {
      params: {
        groupId,
        expectedVersion: args.input.expectedVersion,
        locale: args.input.locale,
        name: args.input.name,
        enabled: args.input.enabled,
        values: args.input.values,
      },
      context: this.searchWorkflowContext(),
    };
    const result = await this.$ctx.kernel.getServices().broker.runWorkflow<
      SearchSynonymGroupMutationWorkflowResult,
      SearchSynonymGroupUpdateWorkflowInput
    >(
      "listing.searchSynonymGroupUpdate",
      workflowInput,
      {
        source: "workflow",
        organizationId: this.$ctx.store.organizationId,
        workflowId:
          `searchSynonymGroupUpdate:${this.$ctx.store.id}:${this.$ctx.requestId}`,
        stepId: "start",
        callId: hashContent({ v: 1, params: workflowInput.params }),
      },
      { adminContext: this.$ctx.adminContext },
    );
    return {
      synonymGroup: result.synonymGroup
        ? mapSearchSynonymGroupAggregate(result.synonymGroup)
        : null,
      userErrors: result.userErrors,
    };
  }

  async productBoostCreate(
    args: ListingSearchMutationProductBoostCreateArgs,
  ) {
    if (!args.input.clientMutationId.trim()) {
      return resourceMutationError("Client mutation ID is required", [
        "input",
        "clientMutationId",
      ], "REQUIRED", "productBoost");
    }
    const productIds = decodeProductIds(args.input.productIds);
    if ("error" in productIds) {
      return resourceMutationError(
        productIds.error.message,
        productIds.error.field,
        productIds.error.code,
        "productBoost",
      );
    }

    const workflowInput: SearchProductBoostCreateWorkflowInput = {
      params: {
        clientMutationId: args.input.clientMutationId,
        locale: args.input.locale,
        name: args.input.name,
        enabled: args.input.enabled,
        phrases: args.input.phrases,
        productIds: productIds.value,
      },
      context: this.searchWorkflowContext(),
    };
    const result = await this.$ctx.kernel.getServices().broker.runWorkflow<
      SearchProductBoostMutationWorkflowResult,
      SearchProductBoostCreateWorkflowInput
    >(
      "listing.searchProductBoostCreate",
      workflowInput,
      {
        source: "workflow",
        organizationId: this.$ctx.store.organizationId,
        workflowId:
          `searchProductBoostCreate:${this.$ctx.store.id}:${this.$ctx.requestId}`,
        stepId: "start",
        callId: hashContent({ v: 1, params: workflowInput.params }),
      },
      { adminContext: this.$ctx.adminContext },
    );
    return {
      productBoost: result.productBoost
        ? mapSearchProductBoostAggregate(result.productBoost)
        : null,
      userErrors: result.userErrors,
    };
  }

  async productBoostUpdate(
    args: ListingSearchMutationProductBoostUpdateArgs,
  ) {
    const boostId = safeDecode(args.input.id, GlobalIdEntity.SearchProductBoost);
    if (!boostId) {
      return resourceMutationError(
        "Invalid search product boost global ID",
        ["input", "id"],
        "INVALID_ID",
        "productBoost",
      );
    }
    if (!Number.isInteger(args.input.expectedVersion) || args.input.expectedVersion <= 0) {
      return resourceMutationError(
        "Expected version must be a positive integer",
        ["input", "expectedVersion"],
        "INVALID_EXPECTED_VERSION",
        "productBoost",
      );
    }
    const productIds = decodeProductIds(args.input.productIds);
    if ("error" in productIds) {
      return resourceMutationError(
        productIds.error.message,
        productIds.error.field,
        productIds.error.code,
        "productBoost",
      );
    }

    const workflowInput: SearchProductBoostUpdateWorkflowInput = {
      params: {
        boostId,
        expectedVersion: args.input.expectedVersion,
        locale: args.input.locale,
        name: args.input.name,
        enabled: args.input.enabled,
        phrases: args.input.phrases,
        productIds: productIds.value,
      },
      context: this.searchWorkflowContext(),
    };
    const result = await this.$ctx.kernel.getServices().broker.runWorkflow<
      SearchProductBoostMutationWorkflowResult,
      SearchProductBoostUpdateWorkflowInput
    >(
      "listing.searchProductBoostUpdate",
      workflowInput,
      {
        source: "workflow",
        organizationId: this.$ctx.store.organizationId,
        workflowId:
          `searchProductBoostUpdate:${this.$ctx.store.id}:${this.$ctx.requestId}`,
        stepId: "start",
        callId: hashContent({ v: 1, params: workflowInput.params }),
      },
      { adminContext: this.$ctx.adminContext },
    );
    return {
      productBoost: result.productBoost
        ? mapSearchProductBoostAggregate(result.productBoost)
        : null,
      userErrors: result.userErrors,
    };
  }

  async synonymGroupDelete(
    args: ListingSearchMutationSynonymGroupDeleteArgs,
  ) {
    const groupId = safeDecode(
      args.input.id,
      GlobalIdEntity.SearchSynonymGroup,
    );
    if (!groupId) {
      return resourceMutationError(
        "Invalid search synonym group global ID",
        ["input", "id"],
        "INVALID_ID",
        "synonymGroup",
      );
    }
    if (!Number.isInteger(args.input.expectedVersion) || args.input.expectedVersion <= 0) {
      return resourceMutationError(
        "Expected version must be a positive integer",
        ["input", "expectedVersion"],
        "INVALID_EXPECTED_VERSION",
        "synonymGroup",
      );
    }

    const workflowInput: SearchSynonymGroupDeleteWorkflowInput = {
      params: { groupId, expectedVersion: args.input.expectedVersion },
      context: this.searchWorkflowContext(),
    };
    const result = await this.$ctx.kernel.getServices().broker.runWorkflow<
      SearchSynonymGroupMutationWorkflowResult,
      SearchSynonymGroupDeleteWorkflowInput
    >(
      "listing.searchSynonymGroupDelete",
      workflowInput,
      {
        source: "workflow",
        organizationId: this.$ctx.store.organizationId,
        workflowId:
          `searchSynonymGroupDelete:${this.$ctx.store.id}:${this.$ctx.requestId}`,
        stepId: "start",
        callId: hashContent({ v: 1, params: workflowInput.params }),
      },
      { adminContext: this.$ctx.adminContext },
    );
    return {
      synonymGroup: result.synonymGroup
        ? mapSearchSynonymGroupAggregate(result.synonymGroup)
        : null,
      userErrors: result.userErrors,
    };
  }

  async productBoostDelete(
    args: ListingSearchMutationProductBoostDeleteArgs,
  ) {
    const boostId = safeDecode(args.input.id, GlobalIdEntity.SearchProductBoost);
    if (!boostId) {
      return resourceMutationError(
        "Invalid search product boost global ID",
        ["input", "id"],
        "INVALID_ID",
        "productBoost",
      );
    }
    if (!Number.isInteger(args.input.expectedVersion) || args.input.expectedVersion <= 0) {
      return resourceMutationError(
        "Expected version must be a positive integer",
        ["input", "expectedVersion"],
        "INVALID_EXPECTED_VERSION",
        "productBoost",
      );
    }

    const workflowInput: SearchProductBoostDeleteWorkflowInput = {
      params: { boostId, expectedVersion: args.input.expectedVersion },
      context: this.searchWorkflowContext(),
    };
    const result = await this.$ctx.kernel.getServices().broker.runWorkflow<
      SearchProductBoostMutationWorkflowResult,
      SearchProductBoostDeleteWorkflowInput
    >(
      "listing.searchProductBoostDelete",
      workflowInput,
      {
        source: "workflow",
        organizationId: this.$ctx.store.organizationId,
        workflowId:
          `searchProductBoostDelete:${this.$ctx.store.id}:${this.$ctx.requestId}`,
        stepId: "start",
        callId: hashContent({ v: 1, params: workflowInput.params }),
      },
      { adminContext: this.$ctx.adminContext },
    );
    return {
      productBoost: result.productBoost
        ? mapSearchProductBoostAggregate(result.productBoost)
        : null,
      userErrors: result.userErrors,
    };
  }

  private searchWorkflowContext() {
    return {
      organizationId: this.$ctx.store.organizationId,
      storeId: this.$ctx.store.id,
      userId: this.$ctx.hasUser ? this.$ctx.user.id : undefined,
      locale: this.$ctx.locale ?? this.$ctx.store.defaultLocale,
      requestId: this.$ctx.requestId,
    };
  }
}

function decodeProductIds(productIds: readonly string[]):
  | { value: string[] }
  | { error: Required<Pick<UserError, "message" | "field" | "code">> } {
  const value: string[] = [];
  for (const [index, productId] of productIds.entries()) {
    const decoded = safeDecode(productId, GlobalIdEntity.Product);
    if (!decoded) {
      return {
        error: {
          message: "Invalid Product global ID",
          field: ["input", "productIds", String(index)],
          code: "INVALID_ID",
        },
      };
    }
    value.push(decoded);
  }
  return { value };
}

function resourceMutationError(
  message: string,
  field: string[],
  code: string,
  resource: "synonymGroup" | "productBoost",
) {
  return {
    [resource]: null,
    userErrors: [{ message, field, code }],
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

function safeDecode(id: string, type: GlobalIdType): string | null {
  try {
    return decodeGlobalIdByType(id, type);
  } catch {
    return null;
  }
}

function toInternalSearchField(field: SearchField): SearchTextField {
  switch (field) {
    case SearchField.ProductTitle:
      return "product_title";
    case SearchField.VariantTitle:
      return "variant_title";
    case SearchField.VendorName:
      return "vendor_name";
    case SearchField.CategoryName:
      return "category_name";
  }
}

function toInternalOutOfStockPolicy(
  policy: SearchOutOfStockPolicy,
): "SHOW" | "HIDE" | "PLACE_LAST" {
  switch (policy) {
    case SearchOutOfStockPolicy.Show:
      return "SHOW";
    case SearchOutOfStockPolicy.Hide:
      return "HIDE";
    case SearchOutOfStockPolicy.PlaceLast:
      return "PLACE_LAST";
  }
}
