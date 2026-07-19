import { isIP } from "node:net";
import type {
  GlobalConfig,
  ServiceConfig,
} from "@shopana/shared-service-config";
import { z } from "zod";

export const IAM_EXTERNAL_REVERSE_PROXY_PATHS = [
  "/auth/applications/:applicationId/*",
  "/.well-known/oauth-authorization-server/auth/applications/:applicationId",
] as const;

const applicationAuthHttpConfigurationSchema = z
  .object({
    public_base_url: z.string().url().optional(),
    trusted_proxy_cidrs: z.array(z.string().min(1)).default([]),
    behind_reverse_proxy: z.boolean().default(false),
    external_paths: z.array(z.string().min(1)).optional(),
  })
  .strict();

export interface IamHttpRuntimeConfiguration {
  port: number;
  publicBaseUrl: string;
  trustedProxyCidrs: string[];
  behindReverseProxy: boolean;
  externalPaths: readonly string[];
  deprecatedAdminGraphqlPortAliasUsed: boolean;
}

export function resolveIamHttpRuntimeConfiguration(input: {
  service: ServiceConfig;
  global: GlobalConfig;
  env?: NodeJS.ProcessEnv;
}): IamHttpRuntimeConfiguration {
  const env = input.env ?? process.env;
  const portFromCommonListener = input.service.ports?.iam_http;
  const portFromDeprecatedAlias = input.service.ports?.admin_graphql;
  if (
    portFromCommonListener !== undefined &&
    portFromDeprecatedAlias !== undefined &&
    portFromCommonListener !== portFromDeprecatedAlias
  ) {
    throw new Error(
      "IAM ports.iam_http conflicts with deprecated ports.admin_graphql"
    );
  }
  const port = portFromCommonListener ?? portFromDeprecatedAlias;
  if (!port) {
    throw new Error("IAM ports.iam_http is required");
  }

  const customConfiguration = applicationAuthHttpConfigurationSchema.parse(
    input.service.application_auth_http ?? {}
  );
  if (
    input.global.environment === "production" &&
    !env.IAM_PUBLIC_BASE_URL
  ) {
    throw new Error("Production IAM_PUBLIC_BASE_URL environment value is required");
  }
  const configuredPublicBaseUrl =
    env.IAM_PUBLIC_BASE_URL ?? customConfiguration.public_base_url;
  if (!configuredPublicBaseUrl) {
    throw new Error("IAM_PUBLIC_BASE_URL is required for the IAM HTTP listener");
  }
  const publicBaseUrl = normalizePublicBaseUrl(configuredPublicBaseUrl);
  if (
    input.global.environment === "production" &&
    !publicBaseUrl.startsWith("https://")
  ) {
    throw new Error("Production IAM_PUBLIC_BASE_URL must use HTTPS");
  }

  const trustedProxyCidrs = customConfiguration.trusted_proxy_cidrs.map(
    validateProxyAddress
  );
  if (
    input.global.environment === "production" &&
    customConfiguration.behind_reverse_proxy &&
    trustedProxyCidrs.length === 0
  ) {
    throw new Error(
      "Production IAM listener behind a reverse proxy requires a trusted proxy allowlist"
    );
  }

  const externalPaths =
    customConfiguration.external_paths ??
    (input.global.environment === "production"
      ? undefined
      : [...IAM_EXTERNAL_REVERSE_PROXY_PATHS]);
  if (!externalPaths) {
    throw new Error(
      "Production IAM application_auth_http.external_paths manifest is required"
    );
  }
  assertExternalPathManifest(externalPaths);

  return {
    port,
    publicBaseUrl,
    trustedProxyCidrs,
    behindReverseProxy: customConfiguration.behind_reverse_proxy,
    externalPaths: Object.freeze([...externalPaths]),
    deprecatedAdminGraphqlPortAliasUsed:
      portFromCommonListener === undefined &&
      portFromDeprecatedAlias !== undefined,
  };
}

function normalizePublicBaseUrl(value: string): string {
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== "" && url.pathname !== "/")
  ) {
    throw new Error("IAM_PUBLIC_BASE_URL must be an origin without a path");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("IAM_PUBLIC_BASE_URL must use HTTP or HTTPS");
  }
  return url.origin;
}

function validateProxyAddress(value: string): string {
  const [address, prefix, ...rest] = value.split("/");
  if (!address || rest.length > 0 || isIP(address) === 0) {
    throw new Error(`Invalid trusted proxy address "${value}"`);
  }
  if (prefix !== undefined) {
    const bits = Number(prefix);
    const maximum = isIP(address) === 4 ? 32 : 128;
    if (!Number.isInteger(bits) || bits < 0 || bits > maximum) {
      throw new Error(`Invalid trusted proxy CIDR "${value}"`);
    }
  }
  return value;
}

function assertExternalPathManifest(paths: readonly string[]): void {
  if (new Set(paths).size !== paths.length || paths.includes("/graphql")) {
    throw new Error("IAM external reverse-proxy path manifest is invalid");
  }
  const actual = [...paths].sort();
  const expected = [...IAM_EXTERNAL_REVERSE_PROXY_PATHS].sort();
  if (
    actual.length !== expected.length ||
    actual.some((path, index) => path !== expected[index])
  ) {
    throw new Error(
      "IAM external reverse-proxy path manifest must expose only approved OAuth/OIDC paths"
    );
  }
}
