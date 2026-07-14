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
  SearchSettingsOperationResult as WorkflowOperationResult,
  SearchSettingsUpdateOperation,
  SearchSettingsUpdateWorkflowInput,
  SearchSettingsUpdateWorkflowResult,
} from "../../workflows/dto/SearchSettingsUpdateWorkflowDto.js";
import {
  SearchConfigurationOperationAction,
  SearchField,
  SearchOutOfStockPolicy,
  SearchSettingsOperationType,
  type SearchSettings as ApiSearchSettings,
  type ListingSearchMutationSettingsUpdateArgs,
  type SearchProductBoostOperationInput,
  type SearchSettingsOperationsInput,
  type SearchSynonymGroupOperationInput,
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
    const mapped = mapSearchSettingsOperations(
      args.expectedVersion,
      args.operations,
    );
    if (mapped.errors.length > 0) {
      return {
        settings: null,
        operationResults: mapped.entries.map(mapPreflightEntry),
        userErrors: mapped.errors,
      };
    }

    const workflowInput: SearchSettingsUpdateWorkflowInput = {
      expectedVersion: args.expectedVersion,
      operations: mapped.operations,
      context: {
        organizationId: this.$ctx.store.organizationId,
        storeId: this.$ctx.store.id,
        userId: this.$ctx.hasUser ? this.$ctx.user.id : undefined,
        locale: this.$ctx.locale ?? this.$ctx.store.defaultLocale,
        requestId: this.$ctx.requestId,
      },
    };
    const payloadHash = hashContent({
      v: 1,
      expectedVersion: args.expectedVersion,
      operations: mapped.operations,
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
      operationResults: result.operationResults.map(mapWorkflowOperationResult),
      userErrors: result.userErrors,
    };
  }
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

interface SearchSettingsMappedEntry {
  type: SearchSettingsUpdateOperation["type"];
  operation?: SearchSettingsUpdateOperation;
  errors: UserError[];
  clientMutationId?: string;
  entityId?: string;
  entityType?: GlobalIdType;
}

interface SearchSettingsMappingResult {
  operations: SearchSettingsUpdateOperation[];
  entries: SearchSettingsMappedEntry[];
  errors: UserError[];
}

function mapSearchSettingsOperations(
  expectedVersion: number,
  input: SearchSettingsOperationsInput,
): SearchSettingsMappingResult {
  const entries: SearchSettingsMappedEntry[] = [];
  const requestErrors: UserError[] = [];

  if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
    requestErrors.push({
      message: "Expected version must be a non-negative integer",
      field: ["expectedVersion"],
      code: "INVALID_EXPECTED_VERSION",
    });
  }

  if (input.settings) {
    entries.push({
      type: "settingsUpdate",
      operation: {
        type: "settingsUpdate",
        params: {
          fields: input.settings.fields.map((configuration) => ({
            field: toInternalSearchField(configuration.field),
            weight: configuration.weight,
          })),
          typoToleranceEnabled: input.settings.typoToleranceEnabled,
          outOfStockPolicy: toInternalOutOfStockPolicy(
            input.settings.outOfStockPolicy,
          ),
        },
        meta: { fieldPrefix: ["operations", "settings"] },
      },
      errors: [],
    });
  }

  for (const [index, operation] of (input.synonymGroups ?? []).entries()) {
    entries.push(mapSynonymOperation(operation, index));
  }
  for (const [index, operation] of (input.productBoosts ?? []).entries()) {
    entries.push(mapProductBoostOperation(operation, index));
  }

  if (entries.length === 0) {
    requestErrors.push({
      message: "At least one search configuration operation is required",
      field: ["operations"],
      code: "EMPTY_OPERATIONS",
    });
  }
  if (expectedVersion === 0 && !input.settings) {
    requestErrors.push({
      message: "Settings are required when initializing search configuration",
      field: ["operations", "settings"],
      code: "REQUIRED",
    });
  }

  addMappingUniquenessErrors(entries);
  const errors = [
    ...requestErrors,
    ...entries.flatMap((entry) => entry.errors),
  ];
  return {
    operations: entries.flatMap((entry) =>
      entry.operation ? [entry.operation] : []
    ),
    entries,
    errors,
  };
}

function mapSynonymOperation(
  input: SearchSynonymGroupOperationInput,
  index: number,
): SearchSettingsMappedEntry {
  const fieldPrefix = ["operations", "synonymGroups", String(index)];
  const errors: UserError[] = [];

  switch (input.action) {
    case SearchConfigurationOperationAction.Create: {
      forbidField(input.id, "id", fieldPrefix, errors);
      const clientMutationId = requiredClientMutationId(
        input.clientMutationId,
        fieldPrefix,
        errors,
      );
      const locale = requiredField(input.locale, "locale", fieldPrefix, errors);
      const name = requiredField(input.name, "name", fieldPrefix, errors);
      const enabled = requiredField(
        input.enabled,
        "enabled",
        fieldPrefix,
        errors,
      );
      const values = requiredField(input.values, "values", fieldPrefix, errors);
      const operation =
        errors.length === 0 &&
          clientMutationId &&
          locale !== undefined &&
          name !== undefined &&
          enabled !== undefined &&
          values !== undefined
          ? ({
              type: "synonymGroupCreate",
              params: { clientMutationId, locale, name, enabled, values },
              meta: { fieldPrefix },
            } satisfies SearchSettingsUpdateOperation)
          : undefined;
      return {
        type: "synonymGroupCreate",
        operation,
        errors,
        clientMutationId,
      };
    }

    case SearchConfigurationOperationAction.Update: {
      forbidField(
        input.clientMutationId,
        "clientMutationId",
        fieldPrefix,
        errors,
      );
      const groupId = decodeRequiredId(
        input.id,
        GlobalIdEntity.SearchSynonymGroup,
        fieldPrefix,
        errors,
      );
      const locale = requiredField(input.locale, "locale", fieldPrefix, errors);
      const name = requiredField(input.name, "name", fieldPrefix, errors);
      const enabled = requiredField(
        input.enabled,
        "enabled",
        fieldPrefix,
        errors,
      );
      const values = requiredField(input.values, "values", fieldPrefix, errors);
      const operation =
        errors.length === 0 &&
          groupId &&
          locale !== undefined &&
          name !== undefined &&
          enabled !== undefined &&
          values !== undefined
          ? ({
              type: "synonymGroupUpdate",
              params: { groupId, locale, name, enabled, values },
              meta: { fieldPrefix },
            } satisfies SearchSettingsUpdateOperation)
          : undefined;
      return {
        type: "synonymGroupUpdate",
        operation,
        errors,
        entityId: groupId,
        entityType: GlobalIdEntity.SearchSynonymGroup,
      };
    }

    case SearchConfigurationOperationAction.Delete: {
      const groupId = decodeRequiredId(
        input.id,
        GlobalIdEntity.SearchSynonymGroup,
        fieldPrefix,
        errors,
      );
      forbidFields(
        input,
        ["clientMutationId", "locale", "name", "enabled", "values"],
        fieldPrefix,
        errors,
      );
      const operation = errors.length === 0 && groupId
        ? ({
            type: "synonymGroupDelete",
            params: { groupId },
            meta: { fieldPrefix },
          } satisfies SearchSettingsUpdateOperation)
        : undefined;
      return {
        type: "synonymGroupDelete",
        operation,
        errors,
        entityId: groupId,
        entityType: GlobalIdEntity.SearchSynonymGroup,
      };
    }
  }
}

function mapProductBoostOperation(
  input: SearchProductBoostOperationInput,
  index: number,
): SearchSettingsMappedEntry {
  const fieldPrefix = ["operations", "productBoosts", String(index)];
  const errors: UserError[] = [];

  switch (input.action) {
    case SearchConfigurationOperationAction.Create: {
      forbidField(input.id, "id", fieldPrefix, errors);
      const clientMutationId = requiredClientMutationId(
        input.clientMutationId,
        fieldPrefix,
        errors,
      );
      const locale = requiredField(input.locale, "locale", fieldPrefix, errors);
      const name = requiredField(input.name, "name", fieldPrefix, errors);
      const enabled = requiredField(
        input.enabled,
        "enabled",
        fieldPrefix,
        errors,
      );
      const phrases = requiredField(
        input.phrases,
        "phrases",
        fieldPrefix,
        errors,
      );
      const productIds = decodeRequiredIds(
        input.productIds,
        GlobalIdEntity.Product,
        "productIds",
        fieldPrefix,
        errors,
      );
      const operation =
        errors.length === 0 &&
          clientMutationId &&
          locale !== undefined &&
          name !== undefined &&
          enabled !== undefined &&
          phrases !== undefined &&
          productIds !== undefined
          ? ({
              type: "productBoostCreate",
              params: {
                clientMutationId,
                locale,
                name,
                enabled,
                phrases,
                productIds,
              },
              meta: { fieldPrefix },
            } satisfies SearchSettingsUpdateOperation)
          : undefined;
      return {
        type: "productBoostCreate",
        operation,
        errors,
        clientMutationId,
      };
    }

    case SearchConfigurationOperationAction.Update: {
      forbidField(
        input.clientMutationId,
        "clientMutationId",
        fieldPrefix,
        errors,
      );
      const boostId = decodeRequiredId(
        input.id,
        GlobalIdEntity.SearchProductBoost,
        fieldPrefix,
        errors,
      );
      const locale = requiredField(input.locale, "locale", fieldPrefix, errors);
      const name = requiredField(input.name, "name", fieldPrefix, errors);
      const enabled = requiredField(
        input.enabled,
        "enabled",
        fieldPrefix,
        errors,
      );
      const phrases = requiredField(
        input.phrases,
        "phrases",
        fieldPrefix,
        errors,
      );
      const productIds = decodeRequiredIds(
        input.productIds,
        GlobalIdEntity.Product,
        "productIds",
        fieldPrefix,
        errors,
      );
      const operation =
        errors.length === 0 &&
          boostId &&
          locale !== undefined &&
          name !== undefined &&
          enabled !== undefined &&
          phrases !== undefined &&
          productIds !== undefined
          ? ({
              type: "productBoostUpdate",
              params: {
                boostId,
                locale,
                name,
                enabled,
                phrases,
                productIds,
              },
              meta: { fieldPrefix },
            } satisfies SearchSettingsUpdateOperation)
          : undefined;
      return {
        type: "productBoostUpdate",
        operation,
        errors,
        entityId: boostId,
        entityType: GlobalIdEntity.SearchProductBoost,
      };
    }

    case SearchConfigurationOperationAction.Delete: {
      const boostId = decodeRequiredId(
        input.id,
        GlobalIdEntity.SearchProductBoost,
        fieldPrefix,
        errors,
      );
      forbidFields(
        input,
        ["clientMutationId", "locale", "name", "enabled", "phrases", "productIds"],
        fieldPrefix,
        errors,
      );
      const operation = errors.length === 0 && boostId
        ? ({
            type: "productBoostDelete",
            params: { boostId },
            meta: { fieldPrefix },
          } satisfies SearchSettingsUpdateOperation)
        : undefined;
      return {
        type: "productBoostDelete",
        operation,
        errors,
        entityId: boostId,
        entityType: GlobalIdEntity.SearchProductBoost,
      };
    }
  }
}

function requiredField<T>(
  value: T | null | undefined,
  field: string,
  fieldPrefix: string[],
  errors: UserError[],
): T | undefined {
  if (value === null || value === undefined) {
    errors.push({
      message: `${field} is required for this operation`,
      field: [...fieldPrefix, field],
      code: "REQUIRED",
    });
    return undefined;
  }
  return value;
}

function requiredClientMutationId(
  value: string | null | undefined,
  fieldPrefix: string[],
  errors: UserError[],
): string | undefined {
  const clientMutationId = value?.trim();
  if (!clientMutationId) {
    errors.push({
      message: "clientMutationId is required for create operations",
      field: [...fieldPrefix, "clientMutationId"],
      code: "REQUIRED",
    });
    return undefined;
  }
  return clientMutationId;
}

function decodeRequiredId(
  value: string | null | undefined,
  type: GlobalIdType,
  fieldPrefix: string[],
  errors: UserError[],
): string | undefined {
  const id = requiredField(value, "id", fieldPrefix, errors);
  if (!id) return undefined;
  const decoded = safeDecode(id, type);
  if (!decoded) {
    errors.push({
      message: "Invalid ID",
      field: [...fieldPrefix, "id"],
      code: "INVALID_ID",
    });
    return undefined;
  }
  return decoded;
}

function decodeRequiredIds(
  values: readonly string[] | null | undefined,
  type: GlobalIdType,
  field: string,
  fieldPrefix: string[],
  errors: UserError[],
): string[] | undefined {
  const required = requiredField(values, field, fieldPrefix, errors);
  if (!required) return undefined;
  return required.map((value, index) => {
    const decoded = safeDecode(value, type);
    if (!decoded) {
      errors.push({
        message: "Invalid ID",
        field: [...fieldPrefix, field, String(index)],
        code: "INVALID_ID",
      });
    }
    return decoded ?? "";
  });
}

function forbidField(
  value: unknown,
  field: string,
  fieldPrefix: string[],
  errors: UserError[],
): void {
  if (value === undefined || value === null) return;
  errors.push({
    message: `${field} is not allowed for this operation`,
    field: [...fieldPrefix, field],
    code: "FIELD_NOT_ALLOWED",
  });
}

function forbidFields<T extends object>(
  input: T,
  fields: Array<keyof T>,
  fieldPrefix: string[],
  errors: UserError[],
): void {
  for (const field of fields) {
    forbidField(input[field], String(field), fieldPrefix, errors);
  }
}

function addMappingUniquenessErrors(entries: SearchSettingsMappedEntry[]): void {
  const clientMutationIds = new Map<string, number>();
  const resourceIds = new Map<string, number>();

  entries.forEach((entry, index) => {
    if (entry.clientMutationId) {
      const previous = clientMutationIds.get(entry.clientMutationId);
      if (previous !== undefined) {
        addDuplicateMappingError(
          entries,
          previous,
          index,
          "clientMutationId",
          "Client mutation ID must be unique within the batch",
          "DUPLICATE_CLIENT_MUTATION_ID",
        );
      } else {
        clientMutationIds.set(entry.clientMutationId, index);
      }
    }

    if (entry.entityId && entry.entityType) {
      const key = `${String(entry.entityType)}:${entry.entityId}`;
      const previous = resourceIds.get(key);
      if (previous !== undefined) {
        addDuplicateMappingError(
          entries,
          previous,
          index,
          "id",
          "A search configuration resource may only be changed once",
          "DUPLICATE_RESOURCE_OPERATION",
        );
      } else {
        resourceIds.set(key, index);
      }
    }
  });
}

function addDuplicateMappingError(
  entries: SearchSettingsMappedEntry[],
  first: number,
  second: number,
  field: string,
  message: string,
  code: string,
): void {
  for (const index of [first, second]) {
    const entry = entries[index];
    const prefix = entry.operation?.meta?.fieldPrefix ?? ["operations"];
    entry.errors.push({ message, field: [...prefix, field], code });
    entry.operation = undefined;
  }
}

function mapPreflightEntry(entry: SearchSettingsMappedEntry) {
  return {
    type: toGraphqlOperationType(entry.type),
    applied: false,
    clientMutationId: entry.clientMutationId,
    entityId: entry.entityId && entry.entityType
      ? encodeGlobalIdByType(entry.entityId, entry.entityType)
      : undefined,
    errors: entry.errors.length > 0
      ? entry.errors
      : [{
          message: "Batch validation failed",
          field: entry.operation?.meta?.fieldPrefix ?? ["operations"],
          code: "BATCH_VALIDATION_FAILED",
        }],
  };
}

function mapWorkflowOperationResult(result: WorkflowOperationResult) {
  const entityType = result.type.startsWith("synonymGroup")
    ? GlobalIdEntity.SearchSynonymGroup
    : result.type.startsWith("productBoost")
      ? GlobalIdEntity.SearchProductBoost
      : undefined;
  return {
    type: toGraphqlOperationType(result.type),
    applied: result.applied,
    clientMutationId: result.clientMutationId,
    entityId: result.entityId && entityType
      ? encodeGlobalIdByType(result.entityId, entityType)
      : undefined,
    errors: result.errors,
  };
}

function toGraphqlOperationType(
  type: SearchSettingsUpdateOperation["type"],
): SearchSettingsOperationType {
  switch (type) {
    case "settingsUpdate":
      return SearchSettingsOperationType.SettingsUpdate;
    case "synonymGroupCreate":
      return SearchSettingsOperationType.SynonymGroupCreate;
    case "synonymGroupUpdate":
      return SearchSettingsOperationType.SynonymGroupUpdate;
    case "synonymGroupDelete":
      return SearchSettingsOperationType.SynonymGroupDelete;
    case "productBoostCreate":
      return SearchSettingsOperationType.ProductBoostCreate;
    case "productBoostUpdate":
      return SearchSettingsOperationType.ProductBoostUpdate;
    case "productBoostDelete":
      return SearchSettingsOperationType.ProductBoostDelete;
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
