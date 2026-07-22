import { Injectable } from "@nestjs/common";
import { DBOS } from "@dbos-inc/dbos-sdk";
import type { IAM, Media } from "@shopana/broker-types";
import {
  BrokerSaga,
  InjectBroker,
  Saga,
  SagaStep,
  ServiceBroker,
  type UserError,
} from "@shopana/shared-kernel";
import { runWithContext, ServiceContext } from "../context/index.js";
import { Kernel } from "../kernel/Kernel.js";
import { Loader } from "../loaders/Loader.js";
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

interface BrandMediaPreparation {
  links: BrandMediaLink[];
  errors: UserError[];
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
    const brandOperation = input.operations.find(
      (operation): operation is Extract<StoreUpdateOperation, { type: "brandUpdate" }> =>
        operation.type === "brandUpdate",
    );
    const previousBrandMedia = brandOperation
      ? await this.loadBrandMedia(input.storeId)
      : null;

    const operationResults: StoreUpdateOperationResult[] = [];
    for (const operation of input.operations) {
      switch (operation.type) {
        case "contactDetailsUpdate":
          operationResults.push(
            await this.updateContactDetails(input, operation),
          );
          break;
        case "addressUpdate":
          operationResults.push(await this.updateAddress(input, operation));
          break;
        case "brandUpdate":
          const authorizationErrors = await this.authorizeBrandUpdate(input);
          if (authorizationErrors.length > 0) {
            operationResults.push({
              type: operation.type,
              applied: false,
              errors: prefixUserErrors(authorizationErrors, operation),
            });
            break;
          }

          if (!previousBrandMedia) {
            operationResults.push({
              type: operation.type,
              applied: false,
              errors: prefixUserErrors(
                [
                  {
                    code: "STORE_BRAND_READ_FAILED",
                    message: "Unable to read current store brand settings",
                    field: null,
                  },
                ],
                operation,
              ),
            });
            break;
          }

          const preparation = await this.prepareBrandMediaLinks(
            input.storeId,
            previousBrandMedia,
            operation.params,
          );
          if (preparation.errors.length > 0) {
            operationResults.push({
              type: operation.type,
              applied: false,
              errors: prefixUserErrors(preparation.errors, operation),
            });
            break;
          }

          const brandResult = await this.updateBrand(input, operation);
          operationResults.push(brandResult);
          if (brandResult.applied) {
            await this.unlinkPreviousBrandMedia(
              input.storeId,
              previousBrandMedia,
              operation.params,
            );
          } else if (preparation.links.length > 0) {
            await this.rollbackBrandMediaLinks(
              input.storeId,
              preparation.links,
            );
          }
          break;
        case "orderProcessingUpdate":
          operationResults.push(
            await this.updateOrderProcessing(input, operation),
          );
          break;
        case "defaultsUpdate":
          operationResults.push(await this.updateDefaults(input, operation));
          break;
        case "currencySettingsUpdate":
          operationResults.push(
            await this.updateCurrencySettings(input, operation),
          );
          break;
      }
    }

    const store = await this.loadStore(
      input.storeId,
      input.context.organizationId,
    );
    const userErrors = operationResults.flatMap(({ errors }) => errors);

    return {
      storeId: store?.id ?? null,
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
  ): Promise<StoreUpdateOperationResult> {
    const result = await this.kernel.runScript(StoreContactDetailsUpdateScript, {
      ...this.operationContext(input),
      ...operation.params,
    });
    return toOperationResult(result, operation);
  }

  @SagaStep()
  private async updateAddress(
    input: StoreUpdateSagaInput,
    operation: Extract<StoreUpdateOperation, { type: "addressUpdate" }>,
  ): Promise<StoreUpdateOperationResult> {
    const result = await this.kernel.runScript(StoreAddressUpdateScript, {
      ...this.operationContext(input),
      ...operation.params,
    });
    return toOperationResult(result, operation);
  }

  @SagaStep()
  private async updateBrand(
    input: StoreUpdateSagaInput,
    operation: Extract<StoreUpdateOperation, { type: "brandUpdate" }>,
  ): Promise<StoreUpdateOperationResult> {
    const result = await this.kernel.runScript(StoreBrandUpdateScript, {
      ...this.operationContext(input),
      ...operation.params,
    });
    return toOperationResult(result, operation);
  }

  @SagaStep()
  private async updateOrderProcessing(
    input: StoreUpdateSagaInput,
    operation: Extract<
      StoreUpdateOperation,
      { type: "orderProcessingUpdate" }
    >,
  ): Promise<StoreUpdateOperationResult> {
    const result = await this.kernel.runScript(StoreOrderProcessingUpdateScript, {
      ...this.operationContext(input),
      ...operation.params,
    });
    return toOperationResult(result, operation);
  }

  @SagaStep()
  private async updateDefaults(
    input: StoreUpdateSagaInput,
    operation: Extract<StoreUpdateOperation, { type: "defaultsUpdate" }>,
  ): Promise<StoreUpdateOperationResult> {
    const result = await this.kernel.runScript(StoreDefaultsUpdateScript, {
      ...this.operationContext(input),
      ...operation.params,
    });
    return toOperationResult(result, operation);
  }

  @SagaStep()
  private async updateCurrencySettings(
    input: StoreUpdateSagaInput,
    operation: Extract<
      StoreUpdateOperation,
      { type: "currencySettingsUpdate" }
    >,
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

  private operationContext(input: StoreUpdateSagaInput) {
    return {
      storeId: input.storeId,
      organizationId: input.context.organizationId,
    };
  }

  @SagaStep()
  private async loadBrandMedia(storeId: string): Promise<BrandMediaIds> {
    const { brand } = await this.kernel.repository.storeSettings.findByStoreId(
      storeId,
    );
    return {
      defaultLogoMediaId: brand?.defaultLogoMediaId ?? null,
      squareLogoMediaId: brand?.squareLogoMediaId ?? null,
      coverImageMediaId: brand?.coverImageMediaId ?? null,
    };
  }

  @SagaStep()
  private loadStore(storeId: string, organizationId: string) {
    return this.kernel.repository.store.findById(storeId, organizationId);
  }

  @SagaStep()
  private async authorizeBrandUpdate(
    input: StoreUpdateSagaInput,
  ): Promise<UserError[]> {
    if (!input.context.userId) {
      return [
        {
          code: "UNAUTHENTICATED",
          message: "Access denied: Subject is missing",
          field: null,
        },
      ];
    }

    const result = await this.broker.call<
      IAM.AuthorizeResult,
      IAM.AuthorizeParams
    >("iam.authorize", {
      subject: input.context.userId,
      organizationId: input.context.organizationId,
      domain: `store:${input.storeId}`,
      resource: "store.profile",
      action: "write",
    });

    return result.allowed
      ? []
      : [
          {
            code: "FORBIDDEN",
            message: "Access denied",
            field: null,
          },
        ];
  }

  @SagaStep()
  private async prepareBrandMediaLinks(
    storeId: string,
    previous: BrandMediaIds,
    next: BrandMediaIds,
  ): Promise<BrandMediaPreparation> {
    const links: BrandMediaLink[] = [];
    const errors: UserError[] = [];

    for (const entry of brandMediaEntries(previous, next)) {
      if (!entry.next || entry.previous === entry.next) continue;

      try {
        const result = await this.broker.call<
          Media.FileLinkResult,
          Media.FileLinkParams
        >("media.fileLink", {
          fileId: entry.next,
          entityRef: storeMediaEntityRef(storeId),
          role: entry.role,
        });

        if (!result.success || !result.fileExists || !result.fileActive) {
          errors.push(
            brandMediaError({
              field: entry.field,
              fileExists: result.fileExists,
              fileActive: result.fileActive,
            }),
          );
          continue;
        }

        links.push({
          fileId: entry.next,
          field: entry.field,
          role: entry.role,
        });
      } catch (error) {
        this.logger.warn(
          `Failed to link ${entry.role} file ${entry.next} to store ${storeId}: ${String(error)}`,
        );
        errors.push({
          code: "MEDIA_LINK_FAILED",
          message: "Unable to attach media file to the store",
          field: [entry.field],
        });
      }
    }

    if (errors.length > 0 && links.length > 0) {
      await this.unlinkMediaLinks(storeId, links);
      return { links: [], errors };
    }

    return { links, errors };
  }

  private async compensatePrepareBrandMediaLinks(
    storeId: string,
    previous: BrandMediaIds,
    next: BrandMediaIds,
  ): Promise<void> {
    const links = brandMediaEntries(previous, next)
      .filter((entry) => entry.next && entry.previous !== entry.next)
      .map((entry) => ({
        fileId: entry.next!,
        field: entry.field,
        role: entry.role,
      }));
    await this.unlinkMediaLinks(storeId, links);
  }

  @SagaStep()
  private async rollbackBrandMediaLinks(
    storeId: string,
    links: BrandMediaLink[],
  ): Promise<void> {
    await this.unlinkMediaLinks(storeId, links);
  }

  @SagaStep()
  private async unlinkPreviousBrandMedia(
    storeId: string,
    previous: BrandMediaIds,
    next: BrandMediaIds,
  ): Promise<void> {
    const links = brandMediaEntries(previous, next)
      .filter(
        (entry) => entry.previous && entry.previous !== entry.next,
      )
      .map((entry) => ({
        fileId: entry.previous!,
        field: entry.field,
        role: entry.role,
      }));
    await this.unlinkMediaLinks(storeId, links);
  }

  private async unlinkMediaLinks(
    storeId: string,
    links: BrandMediaLink[],
  ): Promise<void> {
    for (const link of links) {
      try {
        const result = await this.broker.call<
          Media.FileUnlinkResult,
          Media.FileUnlinkParams
        >("media.fileUnlink", {
          fileId: link.fileId,
          entityRef: storeMediaEntityRef(storeId),
          role: link.role,
        });
        if (!result.success) {
          this.logger.warn(
            `Failed to unlink ${link.role} file ${link.fileId} from store ${storeId}`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Failed to unlink ${link.role} file ${link.fileId} from store ${storeId}: ${String(error)}`,
        );
      }
    }
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
