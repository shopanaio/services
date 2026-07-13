import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  InjectBroker,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { and, eq, inArray } from "drizzle-orm";
import { Kernel } from "../kernel/Kernel.js";
import type { RunScriptContext } from "../kernel/types.js";
import type { UserError } from "../kernel/BaseScript.js";
import {
  searchProductBoost,
  searchSynonymClaim,
  searchSynonymGroup,
} from "../repositories/models/index.js";
import type { SearchSettingsValueInput } from "../repositories/search/searchRepositoryTypes.js";
import {
  SearchProductBoostCreateScript,
  SearchProductBoostDeleteScript,
  SearchProductBoostUpdateScript,
  SearchSettingsUpdateScript,
  SearchSynonymGroupCreateScript,
  SearchSynonymGroupDeleteScript,
  SearchSynonymGroupUpdateScript,
} from "../scripts/search/index.js";
import { validateAndNormalizeSearchSettings } from "../scripts/search/SearchSettingsScripts.js";
import {
  normalizeBoostPhrases,
  normalizeSearchLocale,
  normalizeSynonymValues,
  SearchConfigurationInputError,
  validateCatalogProducts,
  validateSearchResourceName,
} from "../scripts/search/searchConfigurationValidation.js";
import { searchSettingsCacheKey } from "../search/configuration/cacheKeys.js";
import type {
  SearchSettingsOperationResult,
  SearchSettingsOperationStepResult,
  SearchSettingsUpdateOperation,
  SearchSettingsUpdateWorkflowInput,
  SearchSettingsUpdateWorkflowResult,
  SearchSettingsWorkflowContext,
} from "./dto/SearchSettingsUpdateWorkflowDto.js";

interface SearchSettingsBatchValidationResult {
  valid: boolean;
  errorsByOperationIndex: Record<number, UserError[]>;
  userErrors: UserError[];
  normalizedSettings?: SearchSettingsValueInput;
}

type VersionAcquireResult =
  | {
      version: number;
      initialized: boolean;
      cacheKeys: string[];
    }
  | { error: UserError };

type SynonymOperation = Extract<
  SearchSettingsUpdateOperation,
  {
    type:
      | "synonymGroupCreate"
      | "synonymGroupUpdate"
      | "synonymGroupDelete";
  }
>;

type ProductBoostOperation = Extract<
  SearchSettingsUpdateOperation,
  {
    type:
      | "productBoostCreate"
      | "productBoostUpdate"
      | "productBoostDelete";
  }
>;

@Injectable()
export class SearchSettingsUpdateWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("listing") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Workflow("searchSettingsUpdate")
  async run(
    input: SearchSettingsUpdateWorkflowInput,
  ): Promise<SearchSettingsUpdateWorkflowResult> {
    const validation = await this.stepPreValidateOperationBatch(input);
    if (!validation.valid) {
      return {
        settings: null,
        operationResults: input.operations.map((operation, index) =>
          this.buildValidationFailureResult(
            operation,
            validation.errorsByOperationIndex[index] ?? [],
          )
        ),
        userErrors: validation.userErrors,
      };
    }

    const acquired = await this.stepAcquireVersion(
      input,
      validation.normalizedSettings,
    );
    if ("error" in acquired) {
      return {
        settings: null,
        operationResults: [],
        userErrors: [acquired.error],
      };
    }

    const operationResults: SearchSettingsOperationResult[] = [];
    const cacheKeys = [...acquired.cacheKeys];
    const scriptContext = toRunScriptContext(input.context);

    for (const operation of input.operations) {
      if (acquired.initialized && operation.type === "settingsUpdate") {
        operationResults.push({
          type: "settingsUpdate",
          applied: true,
          errors: [],
        });
        continue;
      }

      const stepResult = await this.runOperation(operation, scriptContext);
      operationResults.push(toOperationResult(stepResult));
      cacheKeys.push(...stepResult.cacheKeys);
    }

    await this.stepInvalidateSearchCaches(cacheKeys);

    return {
      settings: { version: acquired.version },
      operationResults,
      userErrors: operationResults.flatMap((result) => result.errors),
    };
  }

  @WorkflowStep()
  private async stepPreValidateOperationBatch(
    input: SearchSettingsUpdateWorkflowInput,
  ): Promise<SearchSettingsBatchValidationResult> {
    const errorsByOperationIndex: Record<number, UserError[]> = {};
    const userErrors: UserError[] = [];
    let normalizedSettings: SearchSettingsValueInput | undefined;

    const addError = (index: number, error: UserError): void => {
      errorsByOperationIndex[index] = errorsByOperationIndex[index] ?? [];
      errorsByOperationIndex[index].push(error);
      userErrors.push(error);
    };
    const addRequestError = (error: UserError): void => {
      if (input.operations.length > 0) addError(0, error);
      else userErrors.push(error);
    };
    const addOperationErrors = (
      index: number,
      operation: SearchSettingsUpdateOperation,
      errors: readonly UserError[],
    ): void => {
      for (const error of prefixErrors(operation, errors)) addError(index, error);
    };

    if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 0) {
      addRequestError({
        message: "Expected version must be a non-negative integer",
        field: ["expectedVersion"],
        code: "INVALID_EXPECTED_VERSION",
      });
    }
    if (input.operations.length === 0) {
      addRequestError({
        message: "At least one search configuration operation is required",
        field: ["operations"],
        code: "EMPTY_OPERATIONS",
      });
    }
    if (
      input.expectedVersion === 0 &&
      !input.operations.some((operation) => operation.type === "settingsUpdate")
    ) {
      addRequestError({
        message: "Settings are required when initializing search configuration",
        field: ["operations", "settings"],
        code: "REQUIRED",
      });
    }
    if (!input.context.userId) {
      addRequestError({
        message: "Authenticated user is required",
        code: "INTERNAL_ERROR",
      });
    }

    validateOperationIdentityUniqueness(input.operations, addError);

    const synonymEntries = input.operations
      .map((operation, index) => ({ operation, index }))
      .filter(
        (entry): entry is { operation: SynonymOperation; index: number } =>
          isSynonymOperation(entry.operation),
      );
    const boostEntries = input.operations
      .map((operation, index) => ({ operation, index }))
      .filter(
        (entry): entry is { operation: ProductBoostOperation; index: number } =>
          isProductBoostOperation(entry.operation),
      );

    const synonymIds = synonymEntries.flatMap(({ operation }) =>
      operation.type === "synonymGroupCreate"
        ? []
        : [operation.params.groupId]
    );
    const boostIds = boostEntries.flatMap(({ operation }) =>
      operation.type === "productBoostCreate"
        ? []
        : [operation.params.boostId]
    );
    const [existingSynonyms, existingBoosts, currentClaims] = await Promise.all([
      synonymIds.length === 0
        ? []
        : this.kernel.db
            .select({ groupId: searchSynonymGroup.groupId })
            .from(searchSynonymGroup)
            .where(
              and(
                eq(searchSynonymGroup.storeId, input.context.storeId),
                inArray(searchSynonymGroup.groupId, [...new Set(synonymIds)]),
              ),
            ),
      boostIds.length === 0
        ? []
        : this.kernel.db
            .select({ boostId: searchProductBoost.boostId })
            .from(searchProductBoost)
            .where(
              and(
                eq(searchProductBoost.storeId, input.context.storeId),
                inArray(searchProductBoost.boostId, [...new Set(boostIds)]),
              ),
            ),
      this.kernel.db
        .select({
          locale: searchSynonymClaim.locale,
          normalizedValue: searchSynonymClaim.normalizedValue,
          groupId: searchSynonymClaim.groupId,
        })
        .from(searchSynonymClaim)
        .where(eq(searchSynonymClaim.storeId, input.context.storeId)),
    ]);
    const existingSynonymIds = new Set(
      existingSynonyms.map((row) => row.groupId),
    );
    const existingBoostIds = new Set(existingBoosts.map((row) => row.boostId));

    for (const { operation, index } of synonymEntries) {
      if (
        operation.type !== "synonymGroupCreate" &&
        !existingSynonymIds.has(operation.params.groupId)
      ) {
        addError(index, {
          message: "Synonym group not found in the current store",
          field: [...fieldPrefix(operation), "id"],
          code: "NOT_FOUND",
        });
      }
    }
    for (const { operation, index } of boostEntries) {
      if (
        operation.type !== "productBoostCreate" &&
        !existingBoostIds.has(operation.params.boostId)
      ) {
        addError(index, {
          message: "Product boost not found in the current store",
          field: [...fieldPrefix(operation), "id"],
          code: "NOT_FOUND",
        });
      }
    }

    const normalizedSynonyms = new Map<
      number,
      { locale: string; values: string[] }
    >();

    for (const [index, operation] of input.operations.entries()) {
      if (operation.type === "settingsUpdate") {
        try {
          normalizedSettings = validateAndNormalizeSearchSettings(
            operation.params,
          );
        } catch (error) {
          addOperationErrors(index, operation, validationErrors(error));
        }
        continue;
      }

      if (isSynonymOperation(operation)) {
        if (operation.type === "synonymGroupDelete") continue;
        let locale: string | undefined;
        try {
          locale = normalizeSearchLocale(operation.params.locale);
        } catch (error) {
          addOperationErrors(index, operation, validationErrors(error));
        }
        try {
          validateSearchResourceName(operation.params.name);
        } catch (error) {
          addOperationErrors(index, operation, validationErrors(error));
        }
        if (locale) {
          try {
            const values = normalizeSynonymValues({
              storeId: input.context.storeId,
              locale,
              values: operation.params.values,
            });
            normalizedSynonyms.set(index, {
              locale,
              values: values.map((value) => value.normalizedValue),
            });
          } catch (error) {
            addOperationErrors(index, operation, validationErrors(error));
          }
        }
        continue;
      }

      if (operation.type !== "productBoostDelete") {
        let locale: string | undefined;
        try {
          locale = normalizeSearchLocale(operation.params.locale);
        } catch (error) {
          addOperationErrors(index, operation, validationErrors(error));
        }
        try {
          validateSearchResourceName(operation.params.name);
        } catch (error) {
          addOperationErrors(index, operation, validationErrors(error));
        }
        if (locale) {
          try {
            normalizeBoostPhrases({
              storeId: input.context.storeId,
              locale,
              phrases: operation.params.phrases,
            });
          } catch (error) {
            addOperationErrors(index, operation, validationErrors(error));
          }
        }
        try {
          await validateCatalogProducts({
            broker: this.broker,
            storeId: input.context.storeId,
            productIds: operation.params.productIds,
          });
        } catch (error) {
          addOperationErrors(index, operation, validationErrors(error));
        }
      }
    }

    validateSynonymClaimSequence({
      entries: synonymEntries,
      normalized: normalizedSynonyms,
      currentClaims,
      addError,
    });

    return {
      valid: userErrors.length === 0,
      errorsByOperationIndex,
      userErrors,
      normalizedSettings,
    };
  }

  @WorkflowStep()
  private async stepAcquireVersion(
    input: SearchSettingsUpdateWorkflowInput,
    initialValues?: SearchSettingsValueInput,
  ): Promise<VersionAcquireResult> {
    const result = await this.kernel.repository.searchSettings.acquireVersion({
      storeId: input.context.storeId,
      expectedVersion: input.expectedVersion,
      initialValues: input.expectedVersion === 0 ? initialValues : undefined,
      actorId: input.context.userId!,
      requestId: input.context.requestId,
    });

    if (result.status === "not_found") {
      return {
        error: {
          message: "Search settings are not initialized",
          field: ["expectedVersion"],
          code: "SETTINGS_NOT_INITIALIZED",
        },
      };
    }
    if (result.status === "conflict") {
      return {
        error: {
          message: input.expectedVersion === 0
            ? "Search settings are already initialized"
            : `Search configuration version conflict; current version is ${result.currentVersion}`,
          field: ["expectedVersion"],
          code: "VERSION_CONFLICT",
        },
      };
    }
    return {
      version: result.version,
      initialized: result.initialized,
      cacheKeys: result.initialized
        ? [searchSettingsCacheKey(input.context.storeId)]
        : [],
    };
  }

  @WorkflowStep()
  private async stepSettingsUpdate(
    operation: Extract<SearchSettingsUpdateOperation, { type: "settingsUpdate" }>,
    context: RunScriptContext,
  ): Promise<SearchSettingsOperationStepResult> {
    const result = await this.kernel.runScript(
      SearchSettingsUpdateScript,
      operation.params,
      context,
    );
    return buildStepResult(operation, result.userErrors, result.cacheKeys);
  }

  @WorkflowStep()
  private async stepSynonymGroupCreate(
    operation: Extract<
      SearchSettingsUpdateOperation,
      { type: "synonymGroupCreate" }
    >,
    context: RunScriptContext,
  ): Promise<SearchSettingsOperationStepResult> {
    const result = await this.kernel.runScript(
      SearchSynonymGroupCreateScript,
      operation.params,
      context,
    );
    return buildStepResult(
      operation,
      result.userErrors,
      result.cacheKeys,
      result.synonymGroup?.group.groupId,
      operation.params.clientMutationId,
    );
  }

  @WorkflowStep()
  private async stepSynonymGroupUpdate(
    operation: Extract<
      SearchSettingsUpdateOperation,
      { type: "synonymGroupUpdate" }
    >,
    context: RunScriptContext,
  ): Promise<SearchSettingsOperationStepResult> {
    const result = await this.kernel.runScript(
      SearchSynonymGroupUpdateScript,
      operation.params,
      context,
    );
    return buildStepResult(
      operation,
      result.userErrors,
      result.cacheKeys,
      operation.params.groupId,
    );
  }

  @WorkflowStep()
  private async stepSynonymGroupDelete(
    operation: Extract<
      SearchSettingsUpdateOperation,
      { type: "synonymGroupDelete" }
    >,
    context: RunScriptContext,
  ): Promise<SearchSettingsOperationStepResult> {
    const result = await this.kernel.runScript(
      SearchSynonymGroupDeleteScript,
      operation.params,
      context,
    );
    return buildStepResult(
      operation,
      result.userErrors,
      result.cacheKeys,
      operation.params.groupId,
    );
  }

  @WorkflowStep()
  private async stepProductBoostCreate(
    operation: Extract<
      SearchSettingsUpdateOperation,
      { type: "productBoostCreate" }
    >,
    context: RunScriptContext,
  ): Promise<SearchSettingsOperationStepResult> {
    const result = await this.kernel.runScript(
      SearchProductBoostCreateScript,
      operation.params,
      context,
    );
    return buildStepResult(
      operation,
      result.userErrors,
      result.cacheKeys,
      result.productBoost?.boost.boostId,
      operation.params.clientMutationId,
    );
  }

  @WorkflowStep()
  private async stepProductBoostUpdate(
    operation: Extract<
      SearchSettingsUpdateOperation,
      { type: "productBoostUpdate" }
    >,
    context: RunScriptContext,
  ): Promise<SearchSettingsOperationStepResult> {
    const result = await this.kernel.runScript(
      SearchProductBoostUpdateScript,
      operation.params,
      context,
    );
    return buildStepResult(
      operation,
      result.userErrors,
      result.cacheKeys,
      operation.params.boostId,
    );
  }

  @WorkflowStep()
  private async stepProductBoostDelete(
    operation: Extract<
      SearchSettingsUpdateOperation,
      { type: "productBoostDelete" }
    >,
    context: RunScriptContext,
  ): Promise<SearchSettingsOperationStepResult> {
    const result = await this.kernel.runScript(
      SearchProductBoostDeleteScript,
      operation.params,
      context,
    );
    return buildStepResult(
      operation,
      result.userErrors,
      result.cacheKeys,
      operation.params.boostId,
    );
  }

  @WorkflowStep()
  private async stepInvalidateSearchCaches(keys: string[]): Promise<void> {
    await Promise.allSettled(
      [...new Set(keys)].map((key) => this.kernel.cache.del(key)),
    );
  }

  private runOperation(
    operation: SearchSettingsUpdateOperation,
    context: RunScriptContext,
  ): Promise<SearchSettingsOperationStepResult> {
    switch (operation.type) {
      case "settingsUpdate":
        return this.stepSettingsUpdate(operation, context);
      case "synonymGroupCreate":
        return this.stepSynonymGroupCreate(operation, context);
      case "synonymGroupUpdate":
        return this.stepSynonymGroupUpdate(operation, context);
      case "synonymGroupDelete":
        return this.stepSynonymGroupDelete(operation, context);
      case "productBoostCreate":
        return this.stepProductBoostCreate(operation, context);
      case "productBoostUpdate":
        return this.stepProductBoostUpdate(operation, context);
      case "productBoostDelete":
        return this.stepProductBoostDelete(operation, context);
    }
  }

  private buildValidationFailureResult(
    operation: SearchSettingsUpdateOperation,
    errors: UserError[],
  ): SearchSettingsOperationResult {
    return {
      type: operation.type,
      applied: false,
      clientMutationId: operation.type === "synonymGroupCreate" ||
          operation.type === "productBoostCreate"
        ? operation.params.clientMutationId
        : undefined,
      entityId: operationEntityId(operation),
      errors: errors.length > 0
        ? errors
        : [{
            message: "Batch validation failed",
            field: fieldPrefix(operation),
            code: "BATCH_VALIDATION_FAILED",
          }],
    };
  }
}

function validateOperationIdentityUniqueness(
  operations: readonly SearchSettingsUpdateOperation[],
  addError: (index: number, error: UserError) => void,
): void {
  const clientMutationIds = new Map<string, number>();
  const resourceIds = new Map<string, number>();

  for (const [index, operation] of operations.entries()) {
    if (
      operation.type === "synonymGroupCreate" ||
      operation.type === "productBoostCreate"
    ) {
      const previous = clientMutationIds.get(operation.params.clientMutationId);
      if (previous !== undefined) {
        for (const target of [previous, index]) {
          addError(target, {
            message: "Client mutation ID must be unique within the batch",
            field: [
              ...fieldPrefix(operations[target]),
              "clientMutationId",
            ],
            code: "DUPLICATE_CLIENT_MUTATION_ID",
          });
        }
      } else {
        clientMutationIds.set(operation.params.clientMutationId, index);
      }
    }

    const entityId = operationEntityId(operation);
    if (!entityId) continue;
    const resourceKey = `${resourceKind(operation)}:${entityId}`;
    const previous = resourceIds.get(resourceKey);
    if (previous !== undefined) {
      for (const target of [previous, index]) {
        addError(target, {
          message: "A search configuration resource may only be changed once",
          field: [...fieldPrefix(operations[target]), "id"],
          code: "DUPLICATE_RESOURCE_OPERATION",
        });
      }
    } else {
      resourceIds.set(resourceKey, index);
    }
  }
}

function validateSynonymClaimSequence(input: {
  entries: Array<{ operation: SynonymOperation; index: number }>;
  normalized: ReadonlyMap<number, { locale: string; values: string[] }>;
  currentClaims: Array<{
    locale: string;
    normalizedValue: string;
    groupId: string;
  }>;
  addError: (index: number, error: UserError) => void;
}): void {
  const claims = new Map<string, string>();
  for (const claim of input.currentClaims) {
    claims.set(claimKey(claim.locale, claim.normalizedValue), claim.groupId);
  }

  const removeGroupClaims = (groupId: string): void => {
    for (const [key, owner] of claims) {
      if (owner === groupId) claims.delete(key);
    }
  };

  for (const { operation, index } of input.entries) {
    if (operation.type !== "synonymGroupCreate") {
      removeGroupClaims(operation.params.groupId);
    }
    if (
      operation.type === "synonymGroupDelete" ||
      !operation.params.enabled
    ) {
      continue;
    }

    const normalized = input.normalized.get(index);
    if (!normalized) continue;
    const owner = operation.type === "synonymGroupCreate"
      ? `create:${index}`
      : operation.params.groupId;
    const hasConflict = normalized.values.some((value) => {
      const currentOwner = claims.get(claimKey(normalized.locale, value));
      return currentOwner !== undefined && currentOwner !== owner;
    });
    if (hasConflict) {
      input.addError(index, {
        message: "Synonym value is already claimed by another active group",
        field: [...fieldPrefix(operation), "values"],
        code: "SYNONYM_CONFLICT",
      });
      continue;
    }
    for (const value of normalized.values) {
      claims.set(claimKey(normalized.locale, value), owner);
    }
  }
}

function claimKey(locale: string, normalizedValue: string): string {
  return `${locale}\u0000${normalizedValue}`;
}

function buildStepResult(
  operation: SearchSettingsUpdateOperation,
  errors: readonly UserError[],
  cacheKeys: readonly string[] | undefined,
  entityId?: string,
  clientMutationId?: string,
): SearchSettingsOperationStepResult {
  const prefixedErrors = prefixErrors(operation, errors);
  return {
    type: operation.type,
    applied: prefixedErrors.length === 0,
    clientMutationId,
    entityId,
    errors: prefixedErrors,
    cacheKeys: prefixedErrors.length === 0 ? [...(cacheKeys ?? [])] : [],
  };
}

function prefixErrors(
  operation: SearchSettingsUpdateOperation,
  errors: readonly UserError[],
): UserError[] {
  const prefix = fieldPrefix(operation);
  return errors.map((error) => {
    const field = error.field?.[0] === "input"
      ? error.field.slice(1)
      : error.field;
    return {
      ...error,
      field: field && field.length > 0 ? [...prefix, ...field] : prefix,
    };
  });
}

function validationErrors(error: unknown): UserError[] {
  if (error instanceof SearchConfigurationInputError) {
    return [...error.userErrors];
  }
  return [{ message: "Internal error", code: "INTERNAL_ERROR" }];
}

function fieldPrefix(operation: SearchSettingsUpdateOperation): string[] {
  return operation.meta?.fieldPrefix ?? ["operations"];
}

function operationEntityId(
  operation: SearchSettingsUpdateOperation,
): string | undefined {
  switch (operation.type) {
    case "synonymGroupUpdate":
    case "synonymGroupDelete":
      return operation.params.groupId;
    case "productBoostUpdate":
    case "productBoostDelete":
      return operation.params.boostId;
    default:
      return undefined;
  }
}

function resourceKind(operation: SearchSettingsUpdateOperation): string {
  return isSynonymOperation(operation) ? "synonym" : "productBoost";
}

function isSynonymOperation(
  operation: SearchSettingsUpdateOperation,
): operation is SynonymOperation {
  return operation.type === "synonymGroupCreate" ||
    operation.type === "synonymGroupUpdate" ||
    operation.type === "synonymGroupDelete";
}

function isProductBoostOperation(
  operation: SearchSettingsUpdateOperation,
): operation is ProductBoostOperation {
  return operation.type === "productBoostCreate" ||
    operation.type === "productBoostUpdate" ||
    operation.type === "productBoostDelete";
}

function toOperationResult(
  result: SearchSettingsOperationStepResult,
): SearchSettingsOperationResult {
  const { cacheKeys: _cacheKeys, ...operationResult } = result;
  return operationResult;
}

function toRunScriptContext(
  context: SearchSettingsWorkflowContext,
): RunScriptContext {
  return {
    storeId: context.storeId,
    organizationId: context.organizationId,
    userId: context.userId,
    locale: context.locale,
    defaultLocale: context.locale,
    requestId: context.requestId,
  };
}
