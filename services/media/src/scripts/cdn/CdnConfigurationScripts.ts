import { BaseScript } from "../../kernel/BaseScript.js";
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

function validateInput(
  input: Partial<CdnConfigurationInput>,
  partial = false
): UserError[] {
  const errors: UserError[] = [];
  if (!partial || input.name !== undefined) {
    if (!input.name?.trim()) {
      errors.push({ field: ["name"], code: "REQUIRED", message: "Name is required" });
    }
  }
  if (!partial || input.provider !== undefined) {
    if (!input.provider?.trim()) {
      errors.push({ field: ["provider"], code: "REQUIRED", message: "Provider is required" });
    }
  }
  if (!partial || input.baseUrl !== undefined) {
    try {
      const url = new URL(input.baseUrl ?? "");
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
      errors.push({
        field: ["baseUrl"],
        code: "INVALID_BASE_URL",
        message: "baseUrl must be an absolute HTTP(S) URL",
      });
    }
  }
  for (const field of ["signingMode", "transformStrategy"] as const) {
    if (input[field] !== undefined && !input[field]?.trim()) {
      errors.push({
        field: [field],
        code: "REQUIRED",
        message: `${field} cannot be empty`,
      });
    }
  }
  for (const field of ["providerConfig", "transformConfig"] as const) {
    const value = input[field];
    if (
      value !== undefined &&
      (value === null || typeof value !== "object" || Array.isArray(value))
    ) {
      errors.push({
        field: [field],
        code: "INVALID_CONFIG",
        message: `${field} must be an object`,
      });
    }
  }
  if (
    !partial &&
    input.signingMode &&
    input.signingMode !== "NONE" &&
    !input.secretRef?.trim()
  ) {
    errors.push({
      field: ["secretRef"],
      code: "SECRET_REF_REQUIRED",
      message: "secretRef is required when signing is enabled",
    });
  }
  return errors;
}

export class CdnConfigurationCreateScript extends BaseScript<
  CdnConfigurationCreateParams,
  CdnConfigurationResult
> {
  protected async execute(
    params: CdnConfigurationCreateParams
  ): Promise<CdnConfigurationResult> {
    const input = normalizeInput(params);
    const userErrors = validateInput(input);
    if (userErrors.length > 0) return { configuration: null, userErrors };

    const assetGroup = await this.getOrCreateStoreAssetGroup();
    const configuration = await this.repository.cdnConfiguration.create(
      assetGroup.id,
      input
    );
    return { configuration, userErrors: [] };
  }

  protected handleError(_error: unknown): CdnConfigurationResult {
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
    const userErrors = [
      ...validateInput(input, true),
      ...new CdnDeliveryService(this.repository).validateConfiguration(merged),
    ];
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

  protected handleError(_error: unknown): CdnConfigurationResult {
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

  protected handleError(_error: unknown): CdnConfigurationResult {
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

  protected handleError(_error: unknown): CdnConfigurationDeleteResult {
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
  protected async execute(
    params: CdnConfigurationTestParams
  ): Promise<CdnConfigurationTestResult> {
    const { objectPath, transform, ...configurationInput } = params;
    const input = normalizeInput(configurationInput);
    const validationErrors = validateInput(input);
    if (!objectPath.trim()) {
      validationErrors.push({
        field: ["objectPath"],
        code: "REQUIRED",
        message: "objectPath is required",
      });
    }
    if (validationErrors.length > 0) {
      return { preview: null, userErrors: validationErrors };
    }

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
      objectPath.trim(),
      transform
    );

    return {
      preview: { ...delivery, configuration: null },
      userErrors: delivery.userErrors,
    };
  }

  protected handleError(_error: unknown): CdnConfigurationTestResult {
    return {
      preview: null,
      userErrors: [
        { code: "CDN_CONFIGURATION_TEST_FAILED", message: "Failed to test CDN configuration" },
      ],
    };
  }
}

export type { CdnProviderConfig, CdnTransformConfig };
