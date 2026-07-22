import { Injectable } from "@nestjs/common";
import { DBOS } from "@dbos-inc/dbos-sdk";
import type { Media } from "@shopana/broker-types";
import {
  BrokerSaga,
  FatalError,
  InjectBroker,
  Saga,
  SagaStep,
  ServiceBroker,
  type UserError,
} from "@shopana/shared-kernel";
import { runWithContext, ServiceContext } from "../context/index.js";
import { Kernel } from "../kernel/Kernel.js";
import { Loader } from "../loaders/Loader.js";
import type {
  StoreAddressData,
  StoreBrandData,
  StoreContactDetailsData,
  StoreCurrencySettingsSnapshotData,
  StoreDefaultsData,
  StoreOrderProcessingData,
} from "../repositories/storeSettings/StoreSettingsRepository.js";
import {
  StoreAddressUpdateScript,
  StoreBrandUpdateScript,
  StoreContactDetailsUpdateScript,
  StoreCurrencySettingsUpdateScript,
  StoreDefaultsUpdateScript,
  StoreOrderProcessingUpdateScript,
} from "../scripts/storeSettings/index.js";
import type {
  StoreAddressUpdateParams,
  StoreBrandUpdateParams,
  StoreContactDetailsUpdateParams,
  StoreCurrencySettingsUpdateParams,
  StoreDefaultsUpdateParams,
  StoreOrderProcessingUpdateParams,
  StoreSettingsUpdateResult,
} from "../scripts/storeSettings/dto.js";

type OperationParams<T> = Omit<T, "storeId" | "organizationId">;

export interface StoreUpdateOperationMeta {
  fieldPrefix?: string[];
}

export type StoreUpdateOperation =
  | {
      type: "contactDetailsUpdate";
      params: OperationParams<StoreContactDetailsUpdateParams>;
      meta?: StoreUpdateOperationMeta;
    }
  | {
      type: "addressUpdate";
      params: OperationParams<StoreAddressUpdateParams>;
      meta?: StoreUpdateOperationMeta;
    }
  | {
      type: "brandUpdate";
      params: OperationParams<StoreBrandUpdateParams>;
      meta?: StoreUpdateOperationMeta;
    }
  | {
      type: "orderProcessingUpdate";
      params: OperationParams<StoreOrderProcessingUpdateParams>;
      meta?: StoreUpdateOperationMeta;
    }
  | {
      type: "defaultsUpdate";
      params: OperationParams<StoreDefaultsUpdateParams>;
      meta?: StoreUpdateOperationMeta;
    }
  | {
      type: "currencySettingsUpdate";
      params: OperationParams<StoreCurrencySettingsUpdateParams>;
      meta?: StoreUpdateOperationMeta;
    };

export interface StoreUpdateSagaInput {
  storeId: string;
  operations: StoreUpdateOperation[];
  context: {
    organizationId: string;
    storeName: string;
    locale: string;
    userId?: string;
  };
}

export interface StoreUpdateOperationResult {
  type: StoreUpdateOperation["type"];
  applied: boolean;
  errors: UserError[];
}

export interface StoreUpdateSagaOutput {
  storeId: string | null;
  operationResults: StoreUpdateOperationResult[];
  userErrors: UserError[];
}

interface BrandMediaIds {
  defaultLogoMediaId: string | null;
  squareLogoMediaId: string | null;
  coverImageMediaId: string | null;
}

interface BrandMediaLink {
  fileId: string;
  field: string;
  role: string;
}

interface StoreUpdateSnapshot {
  contactDetails: StoreContactDetailsData;
  address: StoreAddressData | null;
  brand: StoreBrandData | null;
  orderProcessing: StoreOrderProcessingData | null;
  defaults: StoreDefaultsData;
  currencySettings: StoreCurrencySettingsSnapshotData;
}

@Injectable()
export class StoreUpdateSaga extends BrokerSaga<
  StoreUpdateSagaInput,
  StoreUpdateSagaOutput
> {
  constructor(@InjectBroker("project") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Saga("storeUpdate")
  async run(input: StoreUpdateSagaInput): Promise<StoreUpdateSagaOutput> {
    const context = new ServiceContext({
      requestId: `store-update:${DBOS.workflowID ?? input.storeId}`,
      kernel: this.kernel,
      loaders: new Loader(this.broker),
      storeName: input.context.storeName,
      locale: input.context.locale,
      user: input.context.userId ? { id: input.context.userId } : undefined,
    });

    return runWithContext(context, () => this.execute(input));
  }

  private async execute(
    input: StoreUpdateSagaInput,
  ): Promise<StoreUpdateSagaOutput> {
    const snapshot = await this.captureStoreUpdateSnapshot(input);

    const operationResults: StoreUpdateOperationResult[] = [];
    for (const operation of input.operations) {
      switch (operation.type) {
        case "contactDetailsUpdate":
          operationResults.push(
            await this.updateContactDetails(
              input,
              operation,
              snapshot.contactDetails,
            ),
          );
          break;
        case "addressUpdate":
          operationResults.push(
            await this.updateAddress(input, operation, snapshot.address),
          );
          break;
        case "brandUpdate": {
          const brandResult = await this.updateBrand(
            input,
            operation,
            snapshot.brand,
          );
          operationResults.push(brandResult);
          if (brandResult.applied) {
            const previousMedia = brandMediaIds(snapshot.brand);
            for (const entry of brandMediaEntries(
              previousMedia,
              operation.params,
            )) {
              if (entry.next && entry.previous !== entry.next) {
                await this.linkBrandMedia(input.storeId, {
                  fileId: entry.next,
                  field: entry.field,
                  role: entry.role,
                });
              }
            }
            for (const entry of brandMediaEntries(
              previousMedia,
              operation.params,
            )) {
              if (entry.previous && entry.previous !== entry.next) {
                await this.unlinkBrandMedia(input.storeId, {
                  fileId: entry.previous,
                  field: entry.field,
                  role: entry.role,
                });
              }
            }
          }
          break;
        }
        case "orderProcessingUpdate":
          operationResults.push(
            await this.updateOrderProcessing(
              input,
              operation,
              snapshot.orderProcessing,
            ),
          );
          break;
        case "defaultsUpdate":
          operationResults.push(
            await this.updateDefaults(input, operation, snapshot.defaults),
          );
          break;
        case "currencySettingsUpdate":
          operationResults.push(
            await this.updateCurrencySettings(
              input,
              operation,
              snapshot.currencySettings,
            ),
          );
          break;
      }
    }

    const userErrors = operationResults.flatMap(({ errors }) => errors);

    return {
      storeId: input.storeId,
      operationResults,
      userErrors,
    };
  }

  @SagaStep()
  private async updateContactDetails(
    input: StoreUpdateSagaInput,
    operation: Extract<
      StoreUpdateOperation,
      { type: "contactDetailsUpdate" }
    >,
    _previous: StoreContactDetailsData,
  ): Promise<StoreUpdateOperationResult> {
    const result = await this.kernel.runScript(StoreContactDetailsUpdateScript, {
      ...this.operationContext(input),
      ...operation.params,
    });
    return toOperationResult(result, operation);
  }

  private async compensateUpdateContactDetails(
    input: StoreUpdateSagaInput,
    _operation: Extract<
      StoreUpdateOperation,
      { type: "contactDetailsUpdate" }
    >,
    previous: StoreContactDetailsData,
  ): Promise<void> {
    await this.kernel.repository.storeSettings.restoreContactDetails(
      input.storeId,
      previous,
    );
  }

  @SagaStep()
  private async updateAddress(
    input: StoreUpdateSagaInput,
    operation: Extract<StoreUpdateOperation, { type: "addressUpdate" }>,
    _previous: StoreAddressData | null,
  ): Promise<StoreUpdateOperationResult> {
    const result = await this.kernel.runScript(StoreAddressUpdateScript, {
      ...this.operationContext(input),
      ...operation.params,
    });
    return toOperationResult(result, operation);
  }

  private async compensateUpdateAddress(
    input: StoreUpdateSagaInput,
    _operation: Extract<StoreUpdateOperation, { type: "addressUpdate" }>,
    previous: StoreAddressData | null,
  ): Promise<void> {
    await this.kernel.repository.storeSettings.restoreAddress(
      input.storeId,
      previous,
    );
  }

  @SagaStep()
  private async updateBrand(
    input: StoreUpdateSagaInput,
    operation: Extract<StoreUpdateOperation, { type: "brandUpdate" }>,
    _previous: StoreBrandData | null,
  ): Promise<StoreUpdateOperationResult> {
    const result = await this.kernel.runScript(StoreBrandUpdateScript, {
      ...this.operationContext(input),
      ...operation.params,
    });
    return toOperationResult(result, operation);
  }

  private async compensateUpdateBrand(
    input: StoreUpdateSagaInput,
    _operation: Extract<StoreUpdateOperation, { type: "brandUpdate" }>,
    previous: StoreBrandData | null,
  ): Promise<void> {
    await this.kernel.repository.storeSettings.restoreBrand(
      input.storeId,
      previous,
    );
  }

  @SagaStep()
  private async updateOrderProcessing(
    input: StoreUpdateSagaInput,
    operation: Extract<
      StoreUpdateOperation,
      { type: "orderProcessingUpdate" }
    >,
    _previous: StoreOrderProcessingData | null,
  ): Promise<StoreUpdateOperationResult> {
    const result = await this.kernel.runScript(StoreOrderProcessingUpdateScript, {
      ...this.operationContext(input),
      ...operation.params,
    });
    return toOperationResult(result, operation);
  }

  private async compensateUpdateOrderProcessing(
    input: StoreUpdateSagaInput,
    _operation: Extract<
      StoreUpdateOperation,
      { type: "orderProcessingUpdate" }
    >,
    previous: StoreOrderProcessingData | null,
  ): Promise<void> {
    await this.kernel.repository.storeSettings.restoreOrderProcessing(
      input.storeId,
      previous,
    );
  }

  @SagaStep()
  private async updateDefaults(
    input: StoreUpdateSagaInput,
    operation: Extract<StoreUpdateOperation, { type: "defaultsUpdate" }>,
    _previous: StoreDefaultsData,
  ): Promise<StoreUpdateOperationResult> {
    const result = await this.kernel.runScript(StoreDefaultsUpdateScript, {
      ...this.operationContext(input),
      ...operation.params,
    });
    return toOperationResult(result, operation);
  }

  private async compensateUpdateDefaults(
    input: StoreUpdateSagaInput,
    _operation: Extract<StoreUpdateOperation, { type: "defaultsUpdate" }>,
    previous: StoreDefaultsData,
  ): Promise<void> {
    await this.kernel.repository.storeSettings.restoreDefaults(
      input.storeId,
      previous,
    );
  }

  @SagaStep()
  private async updateCurrencySettings(
    input: StoreUpdateSagaInput,
    operation: Extract<
      StoreUpdateOperation,
      { type: "currencySettingsUpdate" }
    >,
    _previous: StoreCurrencySettingsSnapshotData,
  ): Promise<StoreUpdateOperationResult> {
    const result = await this.kernel.runScript(
      StoreCurrencySettingsUpdateScript,
      {
        ...this.operationContext(input),
        ...operation.params,
      },
    );
    return toOperationResult(result, operation);
  }

  private async compensateUpdateCurrencySettings(
    input: StoreUpdateSagaInput,
    _operation: Extract<
      StoreUpdateOperation,
      { type: "currencySettingsUpdate" }
    >,
    previous: StoreCurrencySettingsSnapshotData,
  ): Promise<void> {
    await this.kernel.repository.storeSettings.restoreCurrencySettings(
      input.storeId,
      previous,
    );
  }

  private operationContext(input: StoreUpdateSagaInput) {
    return {
      storeId: input.storeId,
      organizationId: input.context.organizationId,
    };
  }

  @SagaStep()
  private async captureStoreUpdateSnapshot(
    input: StoreUpdateSagaInput,
  ): Promise<StoreUpdateSnapshot> {
    const [store, settings] = await Promise.all([
      this.kernel.repository.store.findById(
        input.storeId,
        input.context.organizationId,
      ),
      this.kernel.repository.storeSettings.findByStoreId(input.storeId),
    ]);
    if (!store) {
      throw new FatalError("Store not found", undefined, "NOT_FOUND");
    }

    return {
      contactDetails: {
        name: store.displayName,
        slug: store.name,
        email: store.email,
        phoneNumbers: settings.phones.map(({ phoneNumber }) => phoneNumber),
      },
      address: settings.address
        ? {
            companyName: settings.address.companyName,
            countryCode: settings.address.countryCode,
            addressLine1: settings.address.addressLine1,
            addressLine2: settings.address.addressLine2,
            city: settings.address.city,
            administrativeArea: settings.address.administrativeArea,
            postalCode: settings.address.postalCode,
          }
        : null,
      brand: settings.brand
        ? {
            defaultLogoMediaId: settings.brand.defaultLogoMediaId,
            squareLogoMediaId: settings.brand.squareLogoMediaId,
            coverImageMediaId: settings.brand.coverImageMediaId,
            primaryColor: settings.brand.primaryColor,
            secondaryColor: settings.brand.secondaryColor,
            slogan: settings.brand.slogan,
            shortDescription: settings.brand.shortDescription,
            socialLinks: settings.socialLinks.map(({ platform, url }) => ({
              platform,
              url,
            })),
          }
        : null,
      orderProcessing: settings.orderProcessing
        ? {
            orderNumberPrefix: settings.orderProcessing.orderNumberPrefix,
            orderNumberSuffix: settings.orderProcessing.orderNumberSuffix,
            requireCheckoutConfirmation:
              settings.orderProcessing.requireCheckoutConfirmation,
            automaticFulfillmentMode:
              settings.orderProcessing.automaticFulfillmentMode,
            automaticallyArchiveOrders:
              settings.orderProcessing.automaticallyArchiveOrders,
          }
        : null,
      defaults: {
        unitSystem: store.unitSystem,
        defaultWeightUnit:
          store.defaultWeightUnit as StoreDefaultsData["defaultWeightUnit"],
        defaultDimensionUnit:
          store.defaultDimensionUnit as StoreDefaultsData["defaultDimensionUnit"],
        timezone: store.timezone,
      },
      currencySettings: {
        currencyCode: store.currencyCode,
        locale: store.defaultLocale,
        formatting: settings.currencyFormatting
          ? {
              currencyDisplay: settings.currencyFormatting.currencyDisplay,
              currencySign: settings.currencyFormatting.currencySign,
              grouping: settings.currencyFormatting.grouping,
              signDisplay: settings.currencyFormatting.signDisplay,
              minimumFractionDigits:
                settings.currencyFormatting.minimumFractionDigits,
              maximumFractionDigits:
                settings.currencyFormatting.maximumFractionDigits,
              roundingMode: settings.currencyFormatting.roundingMode,
              trailingZeroDisplay:
                settings.currencyFormatting.trailingZeroDisplay,
            }
          : null,
      },
    };
  }

  private async compensateCaptureStoreUpdateSnapshot(
    _input: StoreUpdateSagaInput,
  ): Promise<void> {
    // Read-only step; the no-op compensation makes snapshot capture critical.
  }

  @SagaStep()
  private async linkBrandMedia(
    storeId: string,
    link: BrandMediaLink,
  ): Promise<void> {
    await this.linkMediaReference(storeId, link);
  }

  private async compensateLinkBrandMedia(
    storeId: string,
    link: BrandMediaLink,
  ): Promise<void> {
    await this.unlinkMediaReference(storeId, link);
  }

  @SagaStep()
  private async unlinkBrandMedia(
    storeId: string,
    link: BrandMediaLink,
  ): Promise<void> {
    await this.unlinkMediaReference(storeId, link);
  }

  private async compensateUnlinkBrandMedia(
    storeId: string,
    link: BrandMediaLink,
  ): Promise<void> {
    await this.linkMediaReference(storeId, link);
  }

  private async linkMediaReference(
    storeId: string,
    link: BrandMediaLink,
  ): Promise<void> {
    const result = await this.broker.call<
      Media.FileLinkResult,
      Media.FileLinkParams
    >("media.fileLink", {
      fileId: link.fileId,
      entityRef: storeMediaEntityRef(storeId),
      role: link.role,
    });
    if (result.success && result.fileExists && result.fileActive) return;

    const error = brandMediaError({
      field: link.field,
      fileExists: result.fileExists,
      fileActive: result.fileActive,
    });
    throw new FatalError(
      error.message,
      undefined,
      error.code ?? "MEDIA_LINK_FAILED",
    );
  }

  private async unlinkMediaReference(
    storeId: string,
    link: BrandMediaLink,
  ): Promise<void> {
    const result = await this.broker.call<
      Media.FileUnlinkResult,
      Media.FileUnlinkParams
    >("media.fileUnlink", {
      fileId: link.fileId,
      entityRef: storeMediaEntityRef(storeId),
      role: link.role,
    });
    if (result.success) return;
    throw new FatalError(
      "Unable to detach media file from the store",
      undefined,
      "MEDIA_UNLINK_FAILED",
    );
  }
}

function brandMediaEntries(previous: BrandMediaIds, next: BrandMediaIds) {
  return [
    {
      field: "defaultLogoId",
      role: "defaultLogo",
      previous: previous.defaultLogoMediaId,
      next: next.defaultLogoMediaId,
    },
    {
      field: "squareLogoId",
      role: "squareLogo",
      previous: previous.squareLogoMediaId,
      next: next.squareLogoMediaId,
    },
    {
      field: "coverImageId",
      role: "coverImage",
      previous: previous.coverImageMediaId,
      next: next.coverImageMediaId,
    },
  ];
}

function brandMediaIds(brand: StoreBrandData | null): BrandMediaIds {
  return {
    defaultLogoMediaId: brand?.defaultLogoMediaId ?? null,
    squareLogoMediaId: brand?.squareLogoMediaId ?? null,
    coverImageMediaId: brand?.coverImageMediaId ?? null,
  };
}

function storeMediaEntityRef(storeId: string) {
  return {
    service: "project",
    entityType: "store",
    entityId: storeId,
  };
}

function brandMediaError(input: {
  field: string;
  fileExists: boolean;
  fileActive: boolean;
}): UserError {
  if (!input.fileExists) {
    return {
      code: "MEDIA_FILE_NOT_FOUND",
      message: "Media file not found",
      field: [input.field],
    };
  }
  if (!input.fileActive) {
    return {
      code: "MEDIA_FILE_INACTIVE",
      message: "Media file is not active",
      field: [input.field],
    };
  }
  return {
    code: "MEDIA_LINK_FAILED",
    message: "Unable to attach media file to the store",
    field: [input.field],
  };
}

function toOperationResult(
  result: StoreSettingsUpdateResult,
  operation: StoreUpdateOperation,
): StoreUpdateOperationResult {
  const errors = prefixUserErrors(result.userErrors, operation);
  return {
    type: operation.type,
    applied: Boolean(result.store) && errors.length === 0,
    errors,
  };
}

function prefixUserErrors(
  errors: readonly UserError[],
  operation: StoreUpdateOperation,
): UserError[] {
  const fieldPrefix = operation.meta?.fieldPrefix;
  if (!fieldPrefix?.length) return [...errors];

  const sectionName = fieldPrefix[fieldPrefix.length - 1];
  return errors.map((error) => {
    let field = error.field ?? [];
    if (field[0] === sectionName || field[0] === "input") {
      field = field.slice(1);
    }
    if (field[0] === "storeId" || field[0] === "organizationId") {
      return { ...error, field: ["storeId"] };
    }
    return { ...error, field: [...fieldPrefix, ...field] };
  });
}
