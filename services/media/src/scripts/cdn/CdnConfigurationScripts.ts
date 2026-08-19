import { BaseScript, ZodSchema, ValidationError, toUserErrors } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";
import type {
  CdnConfiguration,
  CdnProviderConfig,
  CdnTransformConfig,
} from "../../repositories/models/index.js";
import type { CdnConfigurationInput } from "../../repositories/CdnConfigurationRepository.js";
import { CdnDeliveryService } from "../../infrastructure/cdn/index.js";
import type {
  CdnDeliveryResult,
  ImageTransformOptions,
} from "../../infrastructure/cdn/index.js";
import {
  cdnConfigurationCreateSchema,
  cdnConfigurationUpdateSchema,
  cdnConfigurationIdSchema,
  cdnConfigurationTestSchema,
} from "./dto/CdnConfigurationDto.js";

export interface CdnConfigurationCreateParams extends CdnConfigurationInput {}

export interface CdnConfigurationUpdateParams
  extends Partial<CdnConfigurationInput> {
  id: string;
}

export interface CdnConfigurationIdParams {
  id: string;
}

export interface CdnConfigurationResult {
  configuration: CdnConfiguration | null;
  userErrors: UserError[];
}

export interface CdnConfigurationDeleteResult {
  deletedConfigurationId: string | null;
  userErrors: UserError[];
}

export interface CdnConfigurationTestParams
  extends CdnConfigurationCreateParams {
  objectPath: string;
  transform?: ImageTransformOptions | null;
}

export interface CdnConfigurationTestResult {
  preview: CdnDeliveryResult | null;
  userErrors: UserError[];
}

function normalizeInput<T extends Partial<CdnConfigurationInput>>(input: T): T {
  const normalized: Partial<CdnConfigurationInput> = { ...input };

  if (input.name !== undefined) normalized.name = input.name.trim();
  if (input.provider !== undefined) normalized.provider = input.provider.trim();
  if (input.baseUrl !== undefined) {
    normalized.baseUrl = input.baseUrl.trim().replace(/\/$/, "");
  }
  if (input.pathPrefix !== undefined) {
    normalized.pathPrefix = input.pathPrefix.trim().replace(/^\/+|\/+$/g, "");
  }
  if (input.signingMode !== undefined) {
    normalized.signingMode = input.signingMode.trim();
  }
  if (Object.hasOwn(input, "secretRef")) {
    normalized.secretRef = input.secretRef?.trim() || null;
  }
  if (input.transformStrategy !== undefined) {
    normalized.transformStrategy = input.transformStrategy.trim();
  }
  if (Object.hasOwn(input, "urlTemplate")) {
    normalized.urlTemplate = input.urlTemplate?.trim() || null;
  }
  if (Object.hasOwn(input, "providerConfig")) {
    normalized.providerConfig = input.providerConfig ?? {};
  }
  if (Object.hasOwn(input, "transformConfig")) {
    normalized.transformConfig = input.transformConfig ?? {};
  }

  return normalized as T;
}

export class CdnConfigurationCreateScript extends BaseScript<
  CdnConfigurationCreateParams,
  CdnConfigurationResult
> {
  @ZodSchema(cdnConfigurationCreateSchema)
  protected async execute(
    params: CdnConfigurationCreateParams
  ): Promise<CdnConfigurationResult> {
    const input = normalizeInput(params);
    // Zod already enforced field shape/bounds; the remaining checks
    // (baseUrl protocol, secretRef-required-when-signing) are business
    // rules that live in CdnDeliveryService as the single source of truth,
    // shared with the update/test scripts.
    const userErrors = new CdnDeliveryService(this.repository).validateConfiguration({
      baseUrl: input.baseUrl,
      signingMode: input.signingMode ?? "NONE",
      secretRef: input.secretRef ?? null,
      transformStrategy: input.transformStrategy ?? "NONE",
      urlTemplate: input.urlTemplate ?? null,
    });
    if (userErrors.length > 0) return { configuration: null, userErrors };

    const assetGroup = await this.getOrCreateStoreAssetGroup();
    const configuration = await this.repository.cdnConfiguration.create(
      assetGroup.id,
      input
    );
    return { configuration, userErrors: [] };
  }

  protected handleError(error: unknown): CdnConfigurationResult {
    if (error instanceof ValidationError) {
      return { configuration: null, userErrors: toUserErrors(error) };
    }
    return {
      configuration: null,
      userErrors: [
        {
          code: "CDN_CONFIGURATION_CREATE_FAILED",
          message: "Failed to create CDN configuration",
        },
      ],
    };
  }
}

export class CdnConfigurationUpdateScript extends BaseScript<
  CdnConfigurationUpdateParams,
  CdnConfigurationResult
> {
  @ZodSchema(cdnConfigurationUpdateSchema)
  protected async execute(
    params: CdnConfigurationUpdateParams
  ): Promise<CdnConfigurationResult> {
    const { id, ...changes } = params;
    const input = normalizeInput(changes);
    const assetGroup = await this.getOrCreateStoreAssetGroup();
    const existing = await this.repository.cdnConfiguration.findById(
      assetGroup.id,
      id
    );
    if (!existing) {
      return {
        configuration: null,
        userErrors: [
          {
            field: ["id"],
            code: "NOT_FOUND",
            message: "CDN configuration not found",
          },
        ],
      };
    }

    const merged = { ...existing, ...input };
    const userErrors = new CdnDeliveryService(this.repository).validateConfiguration(merged);
    if (userErrors.length > 0) return { configuration: null, userErrors };

    return {
      configuration: await this.repository.cdnConfiguration.update(
        assetGroup.id,
        id,
        input
      ),
      userErrors: [],
    };
  }

  protected handleError(error: unknown): CdnConfigurationResult {
    if (error instanceof ValidationError) {
      return { configuration: null, userErrors: toUserErrors(error) };
    }
    return {
      configuration: null,
      userErrors: [
        {
          code: "CDN_CONFIGURATION_UPDATE_FAILED",
          message: "Failed to update CDN configuration",
        },
      ],
    };
  }
}

export class CdnConfigurationSetDefaultScript extends BaseScript<
  CdnConfigurationIdParams,
  CdnConfigurationResult
> {
  @ZodSchema(cdnConfigurationIdSchema)
  protected async execute(
    params: CdnConfigurationIdParams
  ): Promise<CdnConfigurationResult> {
    const assetGroup = await this.getOrCreateStoreAssetGroup();
    const configuration = await this.repository.cdnConfiguration.setDefault(
      assetGroup.id,
      params.id
    );
    return configuration
      ? { configuration, userErrors: [] }
      : {
          configuration: null,
          userErrors: [
            { field: ["id"], code: "NOT_FOUND", message: "CDN configuration not found" },
          ],
        };
  }

  protected handleError(error: unknown): CdnConfigurationResult {
    if (error instanceof ValidationError) {
      return { configuration: null, userErrors: toUserErrors(error) };
    }
    return {
      configuration: null,
      userErrors: [
        { code: "CDN_DEFAULT_UPDATE_FAILED", message: "Failed to set default CDN" },
      ],
    };
  }
}

export class CdnConfigurationDeleteScript extends BaseScript<
  CdnConfigurationIdParams,
  CdnConfigurationDeleteResult
> {
  @ZodSchema(cdnConfigurationIdSchema)
  protected async execute(
    params: CdnConfigurationIdParams
  ): Promise<CdnConfigurationDeleteResult> {
    const assetGroup = await this.getOrCreateStoreAssetGroup();
    const deleted = await this.repository.cdnConfiguration.delete(
      assetGroup.id,
      params.id
    );
    return deleted
      ? { deletedConfigurationId: params.id, userErrors: [] }
      : {
          deletedConfigurationId: null,
          userErrors: [
            { field: ["id"], code: "NOT_FOUND", message: "CDN configuration not found" },
          ],
        };
  }

  protected handleError(error: unknown): CdnConfigurationDeleteResult {
    if (error instanceof ValidationError) {
      return { deletedConfigurationId: null, userErrors: toUserErrors(error) };
    }
    return {
      deletedConfigurationId: null,
      userErrors: [
        { code: "CDN_CONFIGURATION_DELETE_FAILED", message: "Failed to delete CDN configuration" },
      ],
    };
  }
}

export class CdnConfigurationTestScript extends BaseScript<
  CdnConfigurationTestParams,
  CdnConfigurationTestResult
> {
  @ZodSchema(cdnConfigurationTestSchema)
  protected async execute(
    params: CdnConfigurationTestParams
  ): Promise<CdnConfigurationTestResult> {
    const { objectPath, transform, ...configurationInput } = params;
    const input = normalizeInput(configurationInput);
    // Shape/bounds (including objectPath) are enforced by
    // cdnConfigurationTestSchema; `preview()` below runs the same
    // validateConfiguration business-rule check used by create/update.

    const assetGroup = await this.getOrCreateStoreAssetGroup();
    const now = new Date().toISOString();
    const configuration: CdnConfiguration = {
      id: "00000000-0000-0000-0000-000000000000",
      assetGroupId: assetGroup.id,
      name: input.name,
      provider: input.provider,
      baseUrl: input.baseUrl,
      pathPrefix: input.pathPrefix ?? "",
      enabled: input.enabled ?? true,
      isDefault: input.isDefault ?? false,
      signingMode: input.signingMode ?? "NONE",
      secretRef: input.secretRef ?? null,
      transformStrategy: input.transformStrategy ?? "NONE",
      urlTemplate: input.urlTemplate ?? null,
      providerConfig: input.providerConfig ?? {},
      transformConfig: input.transformConfig ?? {},
      createdAt: now,
      updatedAt: now,
    };
    const delivery = await new CdnDeliveryService(this.repository).preview(
      configuration,
      objectPath,
      transform
    );

    return {
      preview: { ...delivery, configuration: null },
      userErrors: delivery.userErrors,
    };
  }

  protected handleError(error: unknown): CdnConfigurationTestResult {
    if (error instanceof ValidationError) {
      return { preview: null, userErrors: toUserErrors(error) };
    }
    return {
      preview: null,
      userErrors: [
        { code: "CDN_CONFIGURATION_TEST_FAILED", message: "Failed to test CDN configuration" },
      ],
    };
  }
}

export type { CdnProviderConfig, CdnTransformConfig };
