import { ZodResolver } from "@shopana/type-resolver";
import type { UserError } from "@shopana/shared-kernel";
import {
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import { BaseResolver } from "./BaseResolver.js";
import { StoreResolver } from "./StoreResolver.js";
import { StoreCreateScript } from "../../scripts/store/StoreCreateScript.js";
import { StoreDeleteScript } from "../../scripts/store/StoreDeleteScript.js";
import { LocaleSetDefaultScript } from "../../scripts/locale/LocaleSetDefaultScript.js";
import { LocaleCreateScript, LocaleDeleteScript } from "../../scripts/locale/index.js";
import { ApiKeyCreateScript } from "../../scripts/apiKey/ApiKeyCreateScript.js";
import { ApiKeyRevokeScript } from "../../scripts/apiKey/ApiKeyRevokeScript.js";
import { ApiKeyDeleteScript } from "../../scripts/apiKey/ApiKeyDeleteScript.js";
import type {
  StoreUpdateOperation,
  StoreUpdateSagaInput,
  StoreUpdateSagaOutput,
} from "../../sagas/index.js";
import type {
  AutomaticFulfillmentMode,
  CurrencyDisplay,
  CurrencyGrouping,
  CurrencyRoundingMode,
  CurrencySign,
  CurrencySignDisplay,
  CurrencyTrailingZeroDisplay,
  StoreStatus,
  UnitSystem,
} from "@src/repositories/models/index.js";
import type {
  AutomaticFulfillmentMode as ApiAutomaticFulfillmentMode,
  CurrencyDisplay as ApiCurrencyDisplay,
  CurrencyGrouping as ApiCurrencyGrouping,
  CurrencyRoundingMode as ApiCurrencyRoundingMode,
  CurrencySign as ApiCurrencySign,
  CurrencySignDisplay as ApiCurrencySignDisplay,
  CurrencyTrailingZeroDisplay as ApiCurrencyTrailingZeroDisplay,
  StoreCreateInput,
  StoreUpdateInput,
  StoreMutationStoreUpdateArgs,
  StoreDeleteInput,
  LocaleSetDefaultInput,
  LocaleCreateInput,
  LocaleDeleteInput,
  ApiKeyCreateInput,
  ApiKeyRevokeInput,
  ApiKeyDeleteInput,
  UnitSystem as ApiUnitSystem,
} from "../../api/graphql-admin/generated/types.js";
import {
  AutomaticFulfillmentMode as ApiAutomaticFulfillmentModeValue,
  CurrencyDisplay as ApiCurrencyDisplayValue,
  CurrencyGrouping as ApiCurrencyGroupingValue,
  CurrencyRoundingMode as ApiCurrencyRoundingModeValue,
  CurrencySign as ApiCurrencySignValue,
  CurrencySignDisplay as ApiCurrencySignDisplayValue,
  CurrencyTrailingZeroDisplay as ApiCurrencyTrailingZeroDisplayValue,
  UnitSystem as ApiUnitSystemValue,
} from "../../api/graphql-admin/generated/types.js";
import {
  StoreCreateInputSchema,
  StoreDeleteInputSchema,
  LocaleSetDefaultInputSchema,
  LocaleCreateInputSchema,
  LocaleDeleteInputSchema,
  ApiKeyCreateInputSchema,
  ApiKeyRevokeInputSchema,
  ApiKeyDeleteInputSchema,
} from "../../api/graphql-admin/generated/schemas.js";

const automaticFulfillmentModeMap: Record<
  ApiAutomaticFulfillmentMode,
  AutomaticFulfillmentMode
> = {
  [ApiAutomaticFulfillmentModeValue.AllLineItems]: "all_line_items",
  [ApiAutomaticFulfillmentModeValue.GiftCardsOnly]: "gift_cards_only",
  [ApiAutomaticFulfillmentModeValue.Disabled]: "disabled",
};

const currencyDisplayMap: Record<ApiCurrencyDisplay, CurrencyDisplay> = {
  [ApiCurrencyDisplayValue.Symbol]: "symbol",
  [ApiCurrencyDisplayValue.NarrowSymbol]: "narrowSymbol",
  [ApiCurrencyDisplayValue.Code]: "code",
  [ApiCurrencyDisplayValue.Name]: "name",
};

const currencySignMap: Record<ApiCurrencySign, CurrencySign> = {
  [ApiCurrencySignValue.Standard]: "standard",
  [ApiCurrencySignValue.Accounting]: "accounting",
};

const currencyGroupingMap: Record<ApiCurrencyGrouping, CurrencyGrouping> = {
  [ApiCurrencyGroupingValue.Auto]: "auto",
  [ApiCurrencyGroupingValue.Always]: "always",
  [ApiCurrencyGroupingValue.Min2]: "min2",
  [ApiCurrencyGroupingValue.Never]: "never",
};

const currencySignDisplayMap: Record<
  ApiCurrencySignDisplay,
  CurrencySignDisplay
> = {
  [ApiCurrencySignDisplayValue.Auto]: "auto",
  [ApiCurrencySignDisplayValue.Always]: "always",
  [ApiCurrencySignDisplayValue.ExceptZero]: "exceptZero",
  [ApiCurrencySignDisplayValue.Negative]: "negative",
  [ApiCurrencySignDisplayValue.Never]: "never",
};

const currencyRoundingModeMap: Record<
  ApiCurrencyRoundingMode,
  CurrencyRoundingMode
> = {
  [ApiCurrencyRoundingModeValue.Ceil]: "ceil",
  [ApiCurrencyRoundingModeValue.Floor]: "floor",
  [ApiCurrencyRoundingModeValue.Expand]: "expand",
  [ApiCurrencyRoundingModeValue.Trunc]: "trunc",
  [ApiCurrencyRoundingModeValue.HalfCeil]: "halfCeil",
  [ApiCurrencyRoundingModeValue.HalfFloor]: "halfFloor",
  [ApiCurrencyRoundingModeValue.HalfExpand]: "halfExpand",
  [ApiCurrencyRoundingModeValue.HalfTrunc]: "halfTrunc",
  [ApiCurrencyRoundingModeValue.HalfEven]: "halfEven",
};

const currencyTrailingZeroDisplayMap: Record<
  ApiCurrencyTrailingZeroDisplay,
  CurrencyTrailingZeroDisplay
> = {
  [ApiCurrencyTrailingZeroDisplayValue.Auto]: "auto",
  [ApiCurrencyTrailingZeroDisplayValue.StripIfInteger]: "stripIfInteger",
};

const unitSystemMap: Record<ApiUnitSystem, UnitSystem> = {
  [ApiUnitSystemValue.Metric]: "metric",
  [ApiUnitSystemValue.Imperial]: "imperial",
};

interface StoreUpdateMappedEntry {
  type: StoreUpdateOperation["type"];
  operation?: StoreUpdateOperation;
  errors: UserError[];
}

interface StoreUpdateMappingResult {
  operations: StoreUpdateOperation[];
  entries: StoreUpdateMappedEntry[];
  errors: UserError[];
}

function mapStoreUpdateInput(
  input?: StoreUpdateInput | null,
): StoreUpdateMappingResult {
  const entries: StoreUpdateMappedEntry[] = [];
  const operations: StoreUpdateOperation[] = [];
  const errors: UserError[] = [];

  const add = (
    type: StoreUpdateOperation["type"],
    operation: StoreUpdateOperation | undefined,
    operationErrors: UserError[] = [],
  ) => {
    entries.push({ type, operation, errors: operationErrors });
    if (operation) operations.push(operation);
    errors.push(...operationErrors);
  };

  if (input?.contactDetails) {
    add("contactDetailsUpdate", {
      type: "contactDetailsUpdate",
      params: {
        name: input.contactDetails.name,
        slug: input.contactDetails.slug,
        email: input.contactDetails.email ?? null,
        phoneNumbers: input.contactDetails.phoneNumbers,
      },
      meta: { fieldPrefix: ["operations", "contactDetails"] },
    });
  }

  if (input?.address) {
    add("addressUpdate", {
      type: "addressUpdate",
      params: {
        companyName: input.address.companyName ?? null,
        countryCode: input.address.countryCode,
        addressLine1: input.address.addressLine1 ?? null,
        addressLine2: input.address.addressLine2 ?? null,
        city: input.address.city ?? null,
        administrativeArea: input.address.administrativeArea ?? null,
        postalCode: input.address.postalCode ?? null,
      },
      meta: { fieldPrefix: ["operations", "address"] },
    });
  }

  if (input?.brand) {
    const brandErrors: UserError[] = [];
    const defaultLogoMediaId = decodeOptionalFileId(
      input.brand.defaultLogoId,
      ["operations", "brand", "defaultLogoId"],
      brandErrors,
    );
    const squareLogoMediaId = decodeOptionalFileId(
      input.brand.squareLogoId,
      ["operations", "brand", "squareLogoId"],
      brandErrors,
    );
    const coverImageMediaId = decodeOptionalFileId(
      input.brand.coverImageId,
      ["operations", "brand", "coverImageId"],
      brandErrors,
    );
    const operation =
      brandErrors.length === 0
        ? ({
            type: "brandUpdate",
            params: {
              defaultLogoMediaId,
              squareLogoMediaId,
              coverImageMediaId,
              primaryColor: input.brand.primaryColor,
              secondaryColor: input.brand.secondaryColor,
              slogan: input.brand.slogan ?? null,
              shortDescription: input.brand.shortDescription ?? null,
              socialLinks: input.brand.socialLinks.map(({ platform, url }) => ({
                platform,
                url,
              })),
            },
            meta: { fieldPrefix: ["operations", "brand"] },
          } satisfies StoreUpdateOperation)
        : undefined;
    add("brandUpdate", operation, brandErrors);
  }

  if (input?.orderProcessing) {
    add("orderProcessingUpdate", {
      type: "orderProcessingUpdate",
      params: {
        orderNumberPrefix: input.orderProcessing.orderNumberPrefix,
        orderNumberSuffix: input.orderProcessing.orderNumberSuffix ?? null,
        requireCheckoutConfirmation:
          input.orderProcessing.requireCheckoutConfirmation,
        automaticFulfillmentMode:
          automaticFulfillmentModeMap[
            input.orderProcessing.automaticFulfillmentMode
          ],
        automaticallyArchiveOrders:
          input.orderProcessing.automaticallyArchiveOrders,
      },
      meta: { fieldPrefix: ["operations", "orderProcessing"] },
    });
  }

  if (input?.defaults) {
    add("defaultsUpdate", {
      type: "defaultsUpdate",
      params: {
        unitSystem: unitSystemMap[input.defaults.unitSystem],
        defaultWeightUnit: input.defaults.defaultWeightUnit,
        defaultDimensionUnit: input.defaults.defaultDimensionUnit,
        timezone: input.defaults.timezone,
      },
      meta: { fieldPrefix: ["operations", "defaults"] },
    });
  }

  if (input?.currencySettings) {
    add("currencySettingsUpdate", {
      type: "currencySettingsUpdate",
      params: {
        currencyCode: input.currencySettings.currencyCode,
        currencyDisplay:
          currencyDisplayMap[input.currencySettings.currencyDisplay],
        currencySign: currencySignMap[input.currencySettings.currencySign],
        grouping: currencyGroupingMap[input.currencySettings.grouping],
        signDisplay:
          currencySignDisplayMap[input.currencySettings.signDisplay],
        minimumFractionDigits:
          input.currencySettings.minimumFractionDigits,
        maximumFractionDigits:
          input.currencySettings.maximumFractionDigits,
        roundingMode:
          currencyRoundingModeMap[input.currencySettings.roundingMode],
        trailingZeroDisplay:
          currencyTrailingZeroDisplayMap[
            input.currencySettings.trailingZeroDisplay
          ],
      },
      meta: { fieldPrefix: ["operations", "currencySettings"] },
    });
  }

  return { operations, entries, errors };
}

function safeDecodeGlobalId(
  value: string,
  expectedType: GlobalIdType,
): string | null {
  try {
    return decodeGlobalIdByType(value, expectedType);
  } catch {
    return null;
  }
}

function decodeOptionalFileId(
  value: string | null | undefined,
  field: string[],
  errors: UserError[],
): string | null {
  if (!value) return null;
  const decoded = safeDecodeGlobalId(value, GlobalIdEntity.File);
  if (!decoded) errors.push(invalidIdError(field));
  return decoded;
}

function invalidIdError(field: string[]): UserError {
  return { message: "Invalid ID format", field, code: "INVALID_ID" };
}

function toGraphqlOperationType(type: StoreUpdateOperation["type"]): string {
  switch (type) {
    case "contactDetailsUpdate":
      return "CONTACT_DETAILS_UPDATE";
    case "addressUpdate":
      return "ADDRESS_UPDATE";
    case "brandUpdate":
      return "BRAND_UPDATE";
    case "orderProcessingUpdate":
      return "ORDER_PROCESSING_UPDATE";
    case "defaultsUpdate":
      return "DEFAULTS_UPDATE";
    case "currencySettingsUpdate":
      return "CURRENCY_SETTINGS_UPDATE";
  }
}

/**
 * StoreMutation namespace resolver.
 * Handles all store-related mutations.
 */
export class StoreMutationResolver extends BaseResolver<Record<string, never>> {
  /**
   * Helper to get the current store from storeName header.
   * Throws if store not found.
   */
  private async getCurrentStore() {
    if (!this.$ctx.storeName) {
      throw new Error(
        "Store not found in request context. Ensure x-store-name header is set."
      );
    }
    const store = await this.$ctx.kernel
      .getServices()
      .repository.store.findByName(this.$ctx.storeName);
    if (!store) {
      throw new Error(`Store not found: ${this.$ctx.storeName}`);
    }
    return store;
  }

  // ==================== Store Mutations ====================

  @ZodResolver(StoreCreateInputSchema())
  async storeCreate(args: { input: StoreCreateInput }) {
    const { input } = args;
    const organizationId = decodeGlobalIdByType(
      input.organizationId,
      GlobalIdEntity.Organization
    );
    const result = await this.$ctx.kernel.runScript(StoreCreateScript, {
      organizationId,
      name: input.name,
      displayName: input.displayName,
      locales: input.locales,
      currencyCode: input.currencyCode,
      status: (input.status?.toLowerCase() as StoreStatus) ?? undefined,
      timezone: input.timezone ?? undefined,
      email: input.email,
    });

    if (!result.store) {
      return {
        store: null,
        userErrors: result.userErrors,
      };
    }

    // Return payload with StoreResolver - executor will resolve it
    return {
      store: new StoreResolver(result.store, this.$ctx),
      userErrors: result.userErrors,
    };
  }

  async storeUpdate(args: StoreMutationStoreUpdateArgs) {
    const storeId = safeDecodeGlobalId(args.storeId, GlobalIdEntity.Store);
    if (!storeId) {
      const error = invalidIdError(["storeId"]);
      return { store: null, operationResults: [], userErrors: [error] };
    }

    const clientMutationId = args.clientMutationId.trim();
    if (clientMutationId.length === 0 || clientMutationId.length > 128) {
      const error = {
        message: "Client mutation ID must contain between 1 and 128 characters",
        field: ["clientMutationId"],
        code: "INVALID_CLIENT_MUTATION_ID",
      };
      return { store: null, operationResults: [], userErrors: [error] };
    }

    if (
      !Number.isSafeInteger(args.expectedRevision) ||
      args.expectedRevision < 0
    ) {
      const error = {
        message: "Expected revision must be a non-negative integer",
        field: ["expectedRevision"],
        code: "INVALID_EXPECTED_REVISION",
      };
      return { store: null, operationResults: [], userErrors: [error] };
    }

    const store = await this.$ctx.kernel.repository.store.findById(storeId);
    if (!store) {
      const error = {
        message: "Store not found",
        field: ["storeId"],
        code: "NOT_FOUND",
      };
      return { store: null, operationResults: [], userErrors: [error] };
    }

    const mapped = mapStoreUpdateInput(args.operations);
    if (mapped.errors.length > 0) {
      return {
        store: null,
        operationResults: mapped.entries.map((entry) => ({
          type: toGraphqlOperationType(entry.type),
          applied: false,
          errors:
            entry.errors.length > 0
              ? entry.errors
              : [
                  {
                    message: "Batch validation failed",
                    code: "BATCH_VALIDATION_FAILED",
                  },
                ],
        })),
        userErrors: mapped.errors,
      };
    }

    let authorizationError: UserError | null = null;
    if (!this.$ctx.user?.id) {
      authorizationError = {
        message: "Access denied: Subject is missing",
        field: null,
        code: "UNAUTHENTICATED",
      };
    } else {
      const allowed = await this.authProvider.authorize({
        subject: this.$ctx.user.id,
        organizationId: store.organizationId,
        domain: `store:${store.id}`,
        resource: "store.profile",
        action: "write",
      });
      if (!allowed) {
        authorizationError = {
          message: "Access denied: store.profile:write",
          field: null,
          code: "FORBIDDEN",
        };
      }
    }
    if (authorizationError) {
      return {
        store: null,
        operationResults: mapped.entries.map((entry) => ({
          type: toGraphqlOperationType(entry.type),
          applied: false,
          errors: [authorizationError],
        })),
        userErrors: [authorizationError],
      };
    }

    const sagaInput: StoreUpdateSagaInput = {
      storeId,
      expectedRevision: args.expectedRevision,
      operations: mapped.operations,
      context: {
        organizationId: store.organizationId,
        storeName: store.name,
        locale: this.$ctx.locale ?? store.defaultLocale,
        userId: this.$ctx.user?.id,
      },
    };
    const sagaResult = await this.$ctx.kernel.getServices().broker.runSaga<
      StoreUpdateSagaOutput,
      StoreUpdateSagaInput
    >("project.storeUpdate", sagaInput, {
      source: "content",
      organizationId: store.organizationId,
      resourceId: storeId,
      operation: "storeUpdate",
      content: {
        clientMutationId,
        expectedRevision: sagaInput.expectedRevision,
        operations: sagaInput.operations,
        userId: sagaInput.context.userId ?? null,
      },
    });

    if (!sagaResult.data) {
      const error = {
        message: sagaResult.error?.message ?? "Failed to update store",
        field: ["operations"],
        code: sagaResult.error?.code ?? "STORE_UPDATE_FAILED",
      };
      return {
        store: null,
        operationResults: mapped.entries.map((entry) => ({
          type: toGraphqlOperationType(entry.type),
          applied: false,
          errors: [error],
        })),
        userErrors: [error],
      };
    }

    const updatedStore = sagaResult.data.storeId
      ? await this.$ctx.kernel.repository.store.findById(sagaResult.data.storeId)
      : null;
    return {
      store: updatedStore ? new StoreResolver(updatedStore, this.$ctx) : null,
      operationResults: sagaResult.data.operationResults.map((result) => ({
        type: toGraphqlOperationType(result.type),
        applied: result.applied,
        errors: result.errors,
      })),
      userErrors: sagaResult.data.userErrors,
    };
  }

  @ZodResolver(StoreDeleteInputSchema())
  async storeDelete(args: { input: StoreDeleteInput }) {
    const { input } = args;
    const id = decodeGlobalIdByType(input.id, GlobalIdEntity.Store);
    const organizationId = decodeGlobalIdByType(
      input.organizationId,
      GlobalIdEntity.Organization
    );

    const result = await this.$ctx.kernel.runScript(StoreDeleteScript, {
      id,
      organizationId,
    });

    return {
      deletedStoreId: result.deletedStoreId
        ? encodeGlobalIdByType(result.deletedStoreId, GlobalIdEntity.Store)
        : null,
      userErrors: result.userErrors,
    };
  }

  // ==================== Locale Mutations ====================

  @ZodResolver(LocaleCreateInputSchema())
  async localeCreate(args: { input: LocaleCreateInput }) {
    const store = await this.getCurrentStore();
    const result = await this.$ctx.kernel.runScript(LocaleCreateScript, {
      storeId: store.id,
      code: args.input.code,
      isActive: args.input.isActive,
    });
    const names = new Intl.DisplayNames(["en"], { type: "language" });
    return {
      locale: result.locale
        ? { ...result.locale, name: names.of(result.locale.code) ?? result.locale.code }
        : null,
      userErrors: result.userErrors,
    };
  }

  @ZodResolver(LocaleDeleteInputSchema())
  async localeDelete(args: { input: LocaleDeleteInput }) {
    const store = await this.getCurrentStore();
    return this.$ctx.kernel.runScript(LocaleDeleteScript, {
      storeId: store.id,
      code: args.input.code,
    });
  }

  @ZodResolver(LocaleSetDefaultInputSchema())
  async localeSetDefault(args: { input: LocaleSetDefaultInput }) {
    const store = await this.getCurrentStore();
    const result = await this.$ctx.kernel.runScript(LocaleSetDefaultScript, {
      storeId: store.id,
      locale: args.input.locale,
    });

    return {
      success: result.success,
      userErrors: result.userErrors,
    };
  }

  // ==================== API Key Mutations ====================

  @ZodResolver(ApiKeyCreateInputSchema())
  async apiKeyCreate(args: { input: ApiKeyCreateInput }) {
    const store = await this.getCurrentStore();
    const result = await this.$ctx.kernel.runScript(ApiKeyCreateScript, {
      storeId: store.id,
      name: args.input.name,
      createdById: this.$ctx.user!.id,
      dueDate: args.input.dueDate ? new Date(args.input.dueDate) : undefined,
    });

    return {
      apiKey: result.apiKey ?? null,
      userErrors: result.userErrors,
    };
  }

  @ZodResolver(ApiKeyRevokeInputSchema())
  async apiKeyRevoke(args: { input: ApiKeyRevokeInput }) {
    const id = decodeGlobalIdByType(args.input.id, GlobalIdEntity.ApiKey);
    const result = await this.$ctx.kernel.runScript(ApiKeyRevokeScript, {
      id,
    });

    return {
      success: result.success,
      userErrors: result.userErrors,
    };
  }

  @ZodResolver(ApiKeyDeleteInputSchema())
  async apiKeyDelete(args: { input: ApiKeyDeleteInput }) {
    const id = decodeGlobalIdByType(args.input.id, GlobalIdEntity.ApiKey);
    const result = await this.$ctx.kernel.runScript(ApiKeyDeleteScript, {
      id,
    });

    return {
      deletedApiKeyId: result.deletedApiKeyId
        ? encodeGlobalIdByType(result.deletedApiKeyId, GlobalIdEntity.ApiKey)
        : null,
      userErrors: result.userErrors,
    };
  }
}
