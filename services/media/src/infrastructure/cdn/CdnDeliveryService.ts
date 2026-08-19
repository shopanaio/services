import type { Repository } from "../../repositories/Repository.js";
import type {
  CdnConfiguration,
  CdnRoutingConditions,
  CdnRoutingRule,
  File,
} from "../../repositories/models/index.js";
import { getBucketName, getS3Client } from "../s3/index.js";
import {
  cdnAdapterRegistry,
  type CdnAdapterContext,
  type CdnAdapterRegistry,
  type CdnNormalizedTransform,
} from "./CdnAdapterRegistry.js";

export interface ImageTransformOptions {
  fit?: string | null;
  gravity?: string | null;
  maxHeight?: number | null;
  maxWidth?: number | null;
  preferredContentType?: string | null;
  scale?: number | null;
  quality?: number | null;
}

export interface CdnDeliveryOptions {
  configurationId?: string | null;
  country?: string | null;
  transform?: ImageTransformOptions | null;
}

export interface CdnDeliveryError {
  code: string;
  message: string;
  field?: string[];
}

export interface CdnDeliveryResult {
  url: string;
  originUrl: string;
  configuration: CdnConfiguration | null;
  routingRule: CdnRoutingRule | null;
  fallback: boolean;
  userErrors: CdnDeliveryError[];
}

export class CdnDeliveryService {
  constructor(
    private readonly repository: Repository,
    private readonly adapters: CdnAdapterRegistry = cdnAdapterRegistry
  ) {}

  async resolve(
    file: File,
    options: CdnDeliveryOptions = {}
  ): Promise<CdnDeliveryResult> {
    const originUrl = file.url;
    const s3Object =
      file.provider === "S3"
        ? await this.repository.s3Object.findByFileId(file.id)
        : null;

    if (isPrivateFile(file)) {
      if (!s3Object) {
        throw new Error("Private media object is unavailable");
      }
      const url = await getS3Client().presignedGetObject(
        getBucketName(),
        s3Object.objectKey,
        300,
        { "response-cache-control": "private, no-store" },
      );
      return {
        url,
        originUrl,
        configuration: null,
        routingRule: null,
        fallback: false,
        userErrors: [],
      };
    }

    if (!s3Object) {
      return {
        url: originUrl,
        originUrl,
        configuration: null,
        routingRule: null,
        fallback: true,
        userErrors: [],
      };
    }

    const selection = await this.selectConfiguration(file, options);
    if (!selection.configuration) {
      return {
        url: originUrl,
        originUrl,
        configuration: null,
        routingRule: selection.routingRule,
        fallback: true,
        userErrors: selection.userErrors,
      };
    }

    const values = this.mergeTransformValues(
      selection.configuration,
      selection.routingRule,
      options.transform
    );
    const transformErrors = this.validateTransformValues(
      selection.configuration,
      values
    );
    if (transformErrors.length > 0) {
      return {
        url: originUrl,
        originUrl,
        configuration: selection.configuration,
        routingRule: selection.routingRule,
        fallback: true,
        userErrors: [...selection.userErrors, ...transformErrors],
      };
    }
    const candidateUrl = this.buildUrl(
      selection.configuration,
      s3Object.objectKey,
      values
    );
    const adapted = await this.applyAdapters({
      configuration: selection.configuration,
      routingRule: selection.routingRule,
      objectPath: s3Object.objectKey,
      transform: values,
      url: candidateUrl,
    });
    const userErrors = [...selection.userErrors, ...adapted.userErrors];

    return {
      url: userErrors.length > 0 ? originUrl : adapted.url,
      originUrl,
      configuration: selection.configuration,
      routingRule: selection.routingRule,
      fallback: userErrors.length > 0,
      userErrors,
    };
  }

  async preview(
    configuration: CdnConfiguration,
    objectPath: string,
    transform?: ImageTransformOptions | null
  ): Promise<CdnDeliveryResult> {
    const userErrors = this.validateConfiguration(configuration);
    const values = this.mergeTransformValues(configuration, null, transform);
    userErrors.push(...this.validateTransformValues(configuration, values));
    const candidateUrl = this.buildUrl(configuration, objectPath, values);
    const adapted = userErrors.length === 0
      ? await this.applyAdapters({
          configuration,
          routingRule: null,
          objectPath,
          transform: values,
          url: candidateUrl,
        })
      : { url: candidateUrl, userErrors: [] };
    userErrors.push(...adapted.userErrors);
    return {
      url: adapted.url,
      originUrl: objectPath,
      configuration,
      routingRule: null,
      fallback: userErrors.length > 0,
      userErrors,
    };
  }

  validateConfiguration(
    configuration: Pick<
      CdnConfiguration,
      | "baseUrl"
      | "signingMode"
      | "secretRef"
      | "transformStrategy"
      | "urlTemplate"
    >
  ): CdnDeliveryError[] {
    const errors: CdnDeliveryError[] = [];
    try {
      const url = new URL(configuration.baseUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error("Unsupported protocol");
      }
    } catch {
      errors.push({
        field: ["baseUrl"],
        code: "INVALID_BASE_URL",
        message: "baseUrl must be an absolute HTTP(S) URL",
      });
    }

    if (
      configuration.signingMode !== "NONE" &&
      !configuration.secretRef?.trim()
    ) {
      errors.push({
        field: ["secretRef"],
        code: "SECRET_REF_REQUIRED",
        message: "secretRef is required when CDN signing is enabled",
      });
    }

    if (configuration.urlTemplate?.trim() && errors.length === 0) {
      const rendered = this.renderTemplate(configuration.urlTemplate, {
        baseUrl: configuration.baseUrl.replace(/\/$/, ""),
        pathPrefix: "media/",
        objectPath: "preview.jpg",
        width: 320,
        height: 240,
        fit: "cover",
        gravity: "center",
        scale: 1,
        format: "webp",
        quality: 80,
        query: "width=320",
      });
      try {
        const base = new URL(configuration.baseUrl);
        const resolved = new URL(rendered);
        if (resolved.origin !== base.origin) throw new Error("Origin mismatch");
      } catch {
        errors.push({
          field: ["urlTemplate"],
          code: "INVALID_URL_TEMPLATE",
          message: "urlTemplate must resolve to the configured baseUrl origin",
        });
      }
    }

    return errors;
  }

  private async selectConfiguration(
    file: File,
    options: CdnDeliveryOptions
  ): Promise<{
    configuration: CdnConfiguration | null;
    routingRule: CdnRoutingRule | null;
    userErrors: CdnDeliveryError[];
  }> {
    if (options.configurationId) {
      const configuration = await this.repository.cdnConfiguration.findById(
        file.assetGroupId,
        options.configurationId
      );
      return configuration
        ? { configuration, routingRule: null, userErrors: [] }
        : {
            configuration: null,
            routingRule: null,
            userErrors: [
              {
                field: ["configurationId"],
                code: "CDN_CONFIGURATION_NOT_FOUND",
                message: "CDN configuration was not found in this media library",
              },
            ],
          };
    }

    const rules = await this.repository.cdnRoutingRule.getEnabled(
      file.assetGroupId
    );
    for (const rule of rules) {
      if (!this.matches(file, rule.conditions, options.country)) continue;
      const configuration = await this.repository.cdnConfiguration.findById(
        file.assetGroupId,
        rule.cdnConfigurationId
      );
      if (configuration?.enabled) {
        return { configuration, routingRule: rule, userErrors: [] };
      }
    }

    return {
      configuration: await this.repository.cdnConfiguration.findDefault(
        file.assetGroupId
      ),
      routingRule: null,
      userErrors: [],
    };
  }

  private matches(
    file: File,
    conditions: CdnRoutingConditions,
    country?: string | null
  ): boolean {
    const matchesArray = (values: string[] | undefined, value: string | null) =>
      !values?.length || (value !== null && values.includes(value));

    if (!matchesArray(conditions.mediaTypes, file.mediaType)) return false;
    if (!matchesArray(conditions.providers, file.provider)) return false;
    if (!matchesArray(conditions.extensions, file.ext?.toLowerCase() ?? null)) {
      return false;
    }
    if (!matchesArray(conditions.countries, country?.toUpperCase() ?? null)) {
      return false;
    }
    if (conditions.minSizeBytes !== undefined && file.sizeBytes < conditions.minSizeBytes) {
      return false;
    }
    if (conditions.maxSizeBytes !== undefined && file.sizeBytes > conditions.maxSizeBytes) {
      return false;
    }
    if (conditions.mimeTypes?.length) {
      const mimeType = file.mimeType ?? "";
      const matchesMime = conditions.mimeTypes.some((candidate) =>
        candidate.endsWith("/*")
          ? mimeType.startsWith(candidate.slice(0, -1))
          : mimeType === candidate
      );
      if (!matchesMime) return false;
    }
    return true;
  }

  private mergeTransformValues(
    configuration: CdnConfiguration,
    rule: CdnRoutingRule | null,
    requested?: ImageTransformOptions | null
  ): CdnNormalizedTransform {
    const configured = configuration.transformConfig as Record<string, unknown>;
    const overrides = (rule?.transformOverrides ?? {}) as Record<string, unknown>;
    const numberValue = (value: unknown): number | undefined =>
      typeof value === "number" && Number.isFinite(value) ? value : undefined;

    let gravity =
      requested?.gravity ??
      (typeof overrides.gravity === "string" ? overrides.gravity : undefined) ??
      (typeof configured.defaultGravity === "string"
        ? configured.defaultGravity
        : undefined);

    if (gravity?.toUpperCase() === "AUTO") {
      const allowedGravities = configured.allowedGravities;
      if (Array.isArray(allowedGravities)) {
        const supportsAuto = allowedGravities
          .filter((item): item is string => typeof item === "string")
          .some((item) => item.toUpperCase() === "AUTO");
        if (!supportsAuto) gravity = "CENTER";
      }
    }

    return {
      fit:
        requested?.fit ??
        (typeof overrides.fit === "string" ? overrides.fit : undefined) ??
        (typeof configured.defaultFit === "string"
          ? configured.defaultFit
          : undefined),
      gravity,
      height:
        requested?.maxHeight ??
        numberValue(overrides.maxHeight) ??
        numberValue(configured.defaultHeight),
      width:
        requested?.maxWidth ??
        numberValue(overrides.maxWidth) ??
        numberValue(configured.defaultWidth),
      format:
        requested?.preferredContentType?.toLowerCase() ??
        (typeof overrides.format === "string" ? overrides.format : undefined) ??
        (typeof configured.defaultFormat === "string"
          ? configured.defaultFormat
          : undefined),
      scale:
        requested?.scale ??
        numberValue(overrides.scale) ??
        numberValue(configured.defaultScale),
      quality:
        numberValue(requested?.quality) ??
        numberValue(overrides.quality) ??
        numberValue(configured.defaultQuality),
    };
  }

  private buildUrl(
    configuration: CdnConfiguration,
    objectPath: string,
    values: CdnNormalizedTransform
  ): string {
    const baseUrl = configuration.baseUrl.replace(/\/$/, "");
    const pathPrefix = configuration.pathPrefix.replace(/^\/+|\/+$/g, "");
    const encodedPath = objectPath
      .split("/")
      .filter(Boolean)
      .map(encodeURIComponent)
      .join("/");
    const path = [pathPrefix, encodedPath].filter(Boolean).join("/");
    const directUrl = `${baseUrl}/${path}`;

    const transformConfig = configuration.transformConfig as Record<
      string,
      unknown
    >;
    const configuredMap = transformConfig.parameterMap;
    const parameterMap =
      typeof configuredMap === "object" && configuredMap !== null
        ? (configuredMap as Record<string, unknown>)
        : {};
    const parameterName = (normalizedName: string) => {
      const configuredName = parameterMap[normalizedName];
      return typeof configuredName === "string" && configuredName.trim()
        ? configuredName.trim()
        : normalizedName;
    };

    const parameters = new URLSearchParams();
    if (values.width) parameters.set(parameterName("width"), String(values.width));
    if (values.height) parameters.set(parameterName("height"), String(values.height));
    if (values.fit) {
      parameters.set(parameterName("fit"), mapValue(transformConfig, "fit", values.fit));
    }
    if (values.gravity) {
      parameters.set(
        parameterName("gravity"),
        mapValue(transformConfig, "gravity", values.gravity)
      );
    }
    if (values.scale) parameters.set(parameterName("scale"), String(values.scale));
    if (values.format) parameters.set(parameterName("format"), values.format);
    if (values.quality) parameters.set(parameterName("quality"), String(values.quality));

    if (configuration.urlTemplate?.trim()) {
      const rendered = this.renderTemplate(configuration.urlTemplate, {
        baseUrl,
        pathPrefix: pathPrefix ? `${pathPrefix}/` : "",
        objectPath: encodedPath,
        width: values.width,
        height: values.height,
        fit: values.fit ? mapValue(transformConfig, "fit", values.fit) : undefined,
        gravity: values.gravity
          ? mapValue(transformConfig, "gravity", values.gravity)
          : undefined,
        scale: values.scale,
        format: values.format,
        quality: values.quality,
        query: parameters.toString(),
      });
      try {
        const base = new URL(baseUrl);
        const resolved = new URL(rendered);
        if (resolved.origin === base.origin) return resolved.toString();
      } catch {
        // Invalid templates safely fall back to the canonical CDN URL below.
      }
    }

    return parameters.size > 0 ? `${directUrl}?${parameters}` : directUrl;
  }

  private validateTransformValues(
    configuration: CdnConfiguration,
    values: CdnNormalizedTransform
  ): CdnDeliveryError[] {
    const config = configuration.transformConfig as Record<string, unknown>;
    const errors: CdnDeliveryError[] = [];
    const finiteNumber = (key: string): number | null => {
      const value = config[key];
      return typeof value === "number" && Number.isFinite(value) ? value : null;
    };
    const checkRange = (
      field: string,
      value: number | undefined,
      minKey: string,
      maxKey: string
    ) => {
      if (value === undefined) return;
      const min = finiteNumber(minKey);
      const max = finiteNumber(maxKey);
      if ((min !== null && value < min) || (max !== null && value > max)) {
        errors.push({
          field: ["transform", field],
          code: "TRANSFORM_OUT_OF_RANGE",
          message: `${field} is outside the configured range`,
        });
      }
    };
    const checkAllowed = (
      field: string,
      value: string | undefined,
      key: string
    ) => {
      const allowed = config[key];
      if (!value || !Array.isArray(allowed)) return;
      const normalized = allowed
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.toLowerCase());
      if (normalized.length > 0 && !normalized.includes(value.toLowerCase())) {
        errors.push({
          field: ["transform", field],
          code: "TRANSFORM_VALUE_NOT_ALLOWED",
          message: `${field} is not allowed by the selected CDN configuration`,
        });
      }
    };

    checkRange("maxWidth", values.width, "minWidth", "maxWidth");
    checkRange("maxHeight", values.height, "minHeight", "maxHeight");
    checkRange("scale", values.scale, "minScale", "maxScale");
    checkRange("quality", values.quality, "minQuality", "maxQuality");
    checkAllowed("preferredContentType", values.format, "allowedFormats");
    checkAllowed("fit", values.fit, "allowedFits");
    checkAllowed("gravity", values.gravity, "allowedGravities");
    return errors;
  }

  private renderTemplate(
    template: string,
    values: Record<string, string | number | undefined>
  ): string {
    return template.replace(/\{([a-zA-Z]+)\}/g, (_match, key: string) => {
      const value = values[key];
      return value === undefined ? "" : String(value);
    });
  }

  private async applyAdapters(
    context: CdnAdapterContext
  ): Promise<{ url: string; userErrors: CdnDeliveryError[] }> {
    const userErrors: CdnDeliveryError[] = [];
    let url = context.url;

    if (context.configuration.transformStrategy !== "NONE") {
      const adapter = this.adapters.getTransform(
        context.configuration.transformStrategy
      );
      if (!adapter) {
        userErrors.push({
          code: "TRANSFORM_ADAPTER_UNAVAILABLE",
          message: `Transform adapter '${context.configuration.transformStrategy}' is not registered`,
        });
      } else {
        try {
          url = await adapter({ ...context, url });
          this.assertConfiguredOrigin(url, context.configuration.baseUrl);
        } catch {
          userErrors.push({
            code: "TRANSFORM_ADAPTER_FAILED",
            message: "The configured transform adapter failed to build a URL",
          });
        }
      }
    }

    if (userErrors.length === 0 && context.configuration.signingMode !== "NONE") {
      const adapter = this.adapters.getSigning(context.configuration.signingMode);
      if (!adapter) {
        userErrors.push({
          code: "SIGNING_ADAPTER_UNAVAILABLE",
          message: `Signing adapter '${context.configuration.signingMode}' is not registered`,
        });
      } else {
        try {
          url = await adapter({ ...context, url });
          this.assertConfiguredOrigin(url, context.configuration.baseUrl);
        } catch {
          userErrors.push({
            code: "SIGNING_ADAPTER_FAILED",
            message: "The configured signing adapter failed to sign the URL",
          });
        }
      }
    }

    return { url, userErrors };
  }

  private assertConfiguredOrigin(url: string, baseUrl: string): void {
    if (new URL(url).origin !== new URL(baseUrl).origin) {
      throw new Error("CDN adapter returned a URL outside the configured origin");
    }
  }
}

/**
 * Translates a normalized transform value (e.g. "COVER", "AUTO") into
 * whatever token the configured provider expects, via the CdnConfiguration's
 * `transform_config.valueMap`. Falls back to a lowercased normalized value
 * when no explicit mapping is configured for the field.
 */
export function mapValue(
  transformConfig: Record<string, unknown>,
  field: string,
  normalizedValue: string
): string {
  const valueMap = transformConfig.valueMap as
    | Record<string, Record<string, string>>
    | undefined;
  return valueMap?.[field]?.[normalizedValue] ?? normalizedValue.toLowerCase();
}

function isPrivateFile(file: File): boolean {
  return (
    file.meta !== null &&
    typeof file.meta === "object" &&
    !Array.isArray(file.meta) &&
    (file.meta as Record<string, unknown>).access === "PRIVATE"
  );
}
