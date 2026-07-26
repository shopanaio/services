import {
  createPublicKey,
  verify as verifySignature,
  type KeyObject,
} from "node:crypto";
import type { ContextCustomer, ContextStore } from "./types.js";
import {
  isStorefrontPermission,
  type StorefrontPermission,
} from "./storefrontPermissions.js";

export const STOREFRONT_CONTEXT_HEADER = "x-shopana-storefront-context";
export const STOREFRONT_CONTEXT_ISSUER = "shopana-storefront-gateway";
export const STOREFRONT_CONTEXT_AUDIENCE =
  "shopana-storefront-subgraphs";

export interface ContextStorefrontAccess {
  readonly connectionId: string;
  readonly installationId: string;
  readonly credentialId: string;
  readonly accessMode: "PUBLIC" | "PRIVATE";
  readonly permissions: readonly StorefrontPermission[];
  readonly policyRevision: number;
}

export interface ResolvedStorefrontAccessContext {
  readonly store: ContextStore;
  readonly access: {
    readonly connectionId: string;
    readonly installationId: string;
    readonly credentialId: string;
    readonly mode: "PUBLIC" | "PRIVATE";
    readonly permissions: readonly StorefrontPermission[];
    readonly policyRevision: number;
  };
}

export interface StorefrontContextClaims {
  readonly iss: typeof STOREFRONT_CONTEXT_ISSUER;
  readonly aud: typeof STOREFRONT_CONTEXT_AUDIENCE;
  readonly sub: string;
  readonly jti: string;
  readonly iat: number;
  readonly exp: number;
  readonly organizationId: string;
  readonly store: ContextStore;
  readonly storefront: ContextStorefrontAccess;
  readonly customer: ContextCustomer | null;
}

export class StorefrontContextVerifier {
  private readonly keys: ReadonlyMap<string, KeyObject>;
  private readonly tolerance: number;

  constructor(options: {
    readonly publicKeys?: Readonly<Record<string, string>>;
    readonly clockToleranceSeconds?: number;
  } = {}) {
    const configured =
      options.publicKeys ?? readPublicKeysFromEnvironment();
    this.keys = new Map(
      Object.entries(configured).map(([kid, value]) => [
        kid,
        createPublicKey(normalizeKey(value)),
      ]),
    );
    if (this.keys.size === 0) {
      throw new Error(
        "STOREFRONT_CONTEXT_PUBLIC_KEYS must contain at least one Ed25519 public key",
      );
    }
    this.tolerance = options.clockToleranceSeconds ?? 5;
  }

  verify(compactJws: string): StorefrontContextClaims {
    if (compactJws.length > 16_384) {
      throw new Error("Storefront context is too large");
    }
    const parts = compactJws.split(".");
    if (parts.length !== 3) throw new Error("Invalid storefront context");
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = parseObject(encodedHeader);
    if (
      header.alg !== "EdDSA" ||
      header.typ !== "JWT" ||
      typeof header.kid !== "string"
    ) {
      throw new Error("Invalid storefront context header");
    }
    const key = this.keys.get(header.kid);
    if (!key) throw new Error("Unknown storefront context key");
    const input = Buffer.from(
      `${encodedHeader}.${encodedPayload}`,
      "ascii",
    );
    if (
      !verifySignature(
        null,
        input,
        key,
        Buffer.from(encodedSignature, "base64url"),
      )
    ) {
      throw new Error("Invalid storefront context signature");
    }
    return validateClaims(parseObject(encodedPayload), this.tolerance);
  }
}

export function readPublicKeysFromEnvironment(): Readonly<
  Record<string, string>
> {
  const value = process.env.STOREFRONT_CONTEXT_PUBLIC_KEYS;
  if (!value) return Object.freeze({});
  const parsed = JSON.parse(value) as unknown;
  if (!isRecord(parsed)) {
    throw new Error("STOREFRONT_CONTEXT_PUBLIC_KEYS must be a JSON object");
  }
  if (
    Object.entries(parsed).some(
      ([kid, key]) =>
        !kid.trim() || typeof key !== "string" || !key.trim(),
    )
  ) {
    throw new Error("Invalid STOREFRONT_CONTEXT_PUBLIC_KEYS entry");
  }
  return Object.freeze(parsed as Record<string, string>);
}

function validateClaims(
  value: Record<string, unknown>,
  tolerance: number,
): StorefrontContextClaims {
  const now = Math.floor(Date.now() / 1000);
  if (
    value.iss !== STOREFRONT_CONTEXT_ISSUER ||
    value.aud !== STOREFRONT_CONTEXT_AUDIENCE ||
    typeof value.sub !== "string" ||
    !value.sub.startsWith("credential:") ||
    typeof value.jti !== "string" ||
    typeof value.iat !== "number" ||
    typeof value.exp !== "number" ||
    value.iat > now + tolerance ||
    value.exp <= now - tolerance ||
    value.exp - value.iat > 65 ||
    typeof value.organizationId !== "string" ||
    !isRecord(value.store) ||
    !isRecord(value.storefront) ||
    (value.customer !== null && !isRecord(value.customer))
  ) {
    throw new Error("Invalid storefront context claims");
  }
  const store = value.store;
  const access = value.storefront;
  const customer = value.customer;
  const permissions = access.permissions;
  if (
    !hasStrings(store, [
      "id", "name", "displayName", "organizationId", "timezone",
      "defaultLocale", "currencyCode",
    ]) ||
    store.organizationId !== value.organizationId ||
    !Array.isArray(store.locales) ||
    !store.locales.every((item) => typeof item === "string") ||
    !hasStrings(access, [
      "connectionId", "installationId", "credentialId", "accessMode",
    ]) ||
    (access.accessMode !== "PUBLIC" && access.accessMode !== "PRIVATE") ||
    !Array.isArray(permissions) ||
    !permissions.every(
      (item) => typeof item === "string" && isStorefrontPermission(item),
    ) ||
    new Set(permissions).size !== permissions.length ||
    !Number.isInteger(access.policyRevision) ||
    (access.policyRevision as number) < 1
  ) {
    throw new Error("Invalid storefront context claims");
  }
  if (
    customer !== null &&
    (
      !hasStrings(customer, ["id", "createdAt", "updatedAt"]) ||
      !hasNullableStrings(customer, [
        "email",
        "firstName",
        "lastName",
        "phone",
        "language",
      ]) ||
      typeof customer.isVerified !== "boolean" ||
      typeof customer.isBlocked !== "boolean"
    )
  ) {
    throw new Error("Invalid storefront context claims");
  }
  return Object.freeze({
    ...(value as unknown as StorefrontContextClaims),
    store: Object.freeze({
      ...(store as unknown as ContextStore),
      locales: Object.freeze([...(store.locales as string[])]),
    }),
    storefront: Object.freeze({
      ...(access as unknown as ContextStorefrontAccess),
      permissions: Object.freeze([...(permissions as StorefrontPermission[])]),
    }),
    customer: customer
      ? Object.freeze({ ...(customer as unknown as ContextCustomer) })
      : null,
  });
}

function parseObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as unknown;
    if (!isRecord(parsed)) throw new Error();
    return parsed;
  } catch {
    throw new Error("Invalid storefront context encoding");
  }
}

function normalizeKey(value: string): string | Buffer {
  return value.includes("BEGIN PUBLIC KEY")
    ? value
    : Buffer.from(value, "base64");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasStrings(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return keys.every(
    (key) => typeof value[key] === "string" && Boolean(value[key]),
  );
}

function hasNullableStrings(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return keys.every(
    (key) => value[key] === null || typeof value[key] === "string",
  );
}
