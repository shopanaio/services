import { createPublicKey, verify as verifySignature, type KeyObject } from "node:crypto";
import {
  adminContextAllows as evaluateAdminContextPermission,
  authorizeAdminContext as evaluateAdminContextAuthorization,
  validateAuthorizeInput,
  type Action,
  type AdminAuthorizationPermission,
  type AdminContextAuthorizeInput as RbacAdminContextAuthorizeInput,
} from "@shopana/rbac";
import type { ContextStore, ContextUser } from "./types.js";

export const ADMIN_CONTEXT_HEADER = "x-shopana-admin-context";
export const ADMIN_CONTEXT_ISSUER = "shopana-admin-gateway";
export const ADMIN_CONTEXT_AUDIENCE = "shopana-admin-subgraphs";
export const ADMIN_CONTEXT_TOKEN_TYPE = "shopana-admin-context+jwt";

export type AdminPermission = AdminAuthorizationPermission;

export interface ResolvedAdminAccessContext {
  readonly user: ContextUser;
  readonly sessionId: string;
  readonly organizationId: string | null;
  readonly store: ContextStore | null;
  readonly permissions: readonly AdminPermission[];
  readonly isSiteAdmin: boolean;
  readonly isOrganizationOwner: boolean;
}

export interface AdminContextClaims extends ResolvedAdminAccessContext {
  readonly iss: typeof ADMIN_CONTEXT_ISSUER;
  readonly aud: typeof ADMIN_CONTEXT_AUDIENCE;
  readonly sub: string;
  readonly jti: string;
  readonly iat: number;
  readonly exp: number;
  readonly tokenUse: "admin_context";
  readonly schemaVersion: 1;
}

export type AdminContextAuthorizeInput = RbacAdminContextAuthorizeInput;

export class AdminContextVerifier {
  private readonly keys: ReadonlyMap<string, KeyObject>;
  private readonly tolerance: number;

  constructor(
    options: {
      readonly publicKeys?: Readonly<Record<string, string>>;
      readonly clockToleranceSeconds?: number;
    } = {},
  ) {
    const configured = options.publicKeys ?? readAdminPublicKeysFromEnvironment();
    this.keys = new Map(
      Object.entries(configured).map(([kid, value]) => {
        const key = createPublicKey(normalizeKey(value));
        if (key.asymmetricKeyType !== "ed25519") {
          throw new Error(`Admin context key "${kid}" must be an Ed25519 public key`);
        }
        return [kid, key];
      }),
    );
    if (this.keys.size === 0) {
      throw new Error("ADMIN_CONTEXT_PUBLIC_KEYS must contain at least one Ed25519 public key");
    }
    this.tolerance = options.clockToleranceSeconds ?? 5;
    if (!Number.isInteger(this.tolerance) || this.tolerance < 0 || this.tolerance > 60) {
      throw new Error("Admin context clock tolerance must be an integer between 0 and 60");
    }
  }

  verify(compactJws: string): AdminContextClaims {
    if (compactJws.length > 16_384) {
      throw new Error("Admin context is too large");
    }
    const parts = compactJws.split(".");
    if (parts.length !== 3) throw new Error("Invalid admin context");
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = parseObject(encodedHeader);
    if (
      header.alg !== "EdDSA" ||
      header.typ !== ADMIN_CONTEXT_TOKEN_TYPE ||
      typeof header.kid !== "string"
    ) {
      throw new Error("Invalid admin context header");
    }
    const key = this.keys.get(header.kid);
    if (!key) throw new Error("Unknown admin context key");
    const input = Buffer.from(`${encodedHeader}.${encodedPayload}`, "ascii");
    if (!verifySignature(null, input, key, Buffer.from(encodedSignature, "base64url"))) {
      throw new Error("Invalid admin context signature");
    }
    return validateClaims(parseObject(encodedPayload), this.tolerance);
  }
}

export function parseResolvedAdminAccessContext(value: unknown): ResolvedAdminAccessContext {
  if (!isRecord(value)) {
    throw new Error("Invalid admin context resolver response");
  }
  const user = parseUser(value.user);
  const sessionId = requiredString(value, "sessionId", 1_024);
  const organizationId = nullableString(value.organizationId, 255);
  const store = value.store === null ? null : parseStore(value.store);
  const isSiteAdmin = requiredBoolean(value, "isSiteAdmin");
  const isOrganizationOwner = requiredBoolean(value, "isOrganizationOwner");
  if (!Array.isArray(value.permissions) || value.permissions.length > 256) {
    throw new Error("Invalid admin context resolver response");
  }
  const permissions = value.permissions.map(parsePermission);
  const permissionKeys = permissions.map(permissionKey);
  if (new Set(permissionKeys).size !== permissionKeys.length) {
    throw new Error("Invalid admin context resolver response");
  }

  if (store) {
    if (
      organizationId !== store.organizationId ||
      permissions.some(({ domain }) => domain !== "org" && domain !== `store:${store.id}`)
    ) {
      throw new Error("Invalid admin context resolver response");
    }
  } else {
    if (organizationId === null) {
      if (permissions.length > 0 || isOrganizationOwner) {
        throw new Error("Invalid admin context resolver response");
      }
    } else if (permissions.some(({ domain }) => domain !== "org")) {
      throw new Error("Invalid admin context resolver response");
    }
  }

  return Object.freeze({
    user,
    sessionId,
    organizationId,
    store,
    permissions: Object.freeze(permissions),
    isSiteAdmin,
    isOrganizationOwner,
  });
}

export function adminContextAllows(
  context: Pick<AdminContextClaims, "permissions" | "isSiteAdmin" | "isOrganizationOwner">,
  input: {
    readonly domain: string;
    readonly resource: string;
    readonly action: string;
  },
): boolean {
  return evaluateAdminContextPermission(context, input);
}

/**
 * Authorize an admin operation against gateway-issued claims.
 *
 * Besides checking the permission, this binds the operation to the JWT
 * subject, organization and selected store. Organization-name-only checks
 * fail closed because the token intentionally carries only the canonical ID.
 */
export function authorizeAdminContext(
  context: AdminContextClaims | undefined,
  input: AdminContextAuthorizeInput,
): boolean {
  return evaluateAdminContextAuthorization(context, input);
}

export function readAdminPublicKeysFromEnvironment(): Readonly<Record<string, string>> {
  const value = process.env.ADMIN_CONTEXT_PUBLIC_KEYS;
  if (!value) return Object.freeze({});
  const parsed = JSON.parse(value) as unknown;
  if (!isRecord(parsed)) {
    throw new Error("ADMIN_CONTEXT_PUBLIC_KEYS must be a JSON object");
  }
  if (
    Object.entries(parsed).some(
      ([kid, key]) =>
        !/^[A-Za-z0-9._-]{1,128}$/.test(kid) || typeof key !== "string" || !key.trim(),
    )
  ) {
    throw new Error("Invalid ADMIN_CONTEXT_PUBLIC_KEYS entry");
  }
  return Object.freeze(parsed as Record<string, string>);
}

function validateClaims(value: Record<string, unknown>, tolerance: number): AdminContextClaims {
  const now = Math.floor(Date.now() / 1_000);
  if (
    value.iss !== ADMIN_CONTEXT_ISSUER ||
    value.aud !== ADMIN_CONTEXT_AUDIENCE ||
    typeof value.sub !== "string" ||
    !value.sub.startsWith("user:") ||
    typeof value.jti !== "string" ||
    !value.jti ||
    typeof value.iat !== "number" ||
    typeof value.exp !== "number" ||
    value.iat > now + tolerance ||
    value.exp <= now - tolerance ||
    value.exp - value.iat > 65 ||
    value.tokenUse !== "admin_context" ||
    value.schemaVersion !== 1
  ) {
    throw new Error("Invalid admin context claims");
  }
  const resolved = parseResolvedAdminAccessContext(value);
  if (value.sub !== `user:${resolved.user.id}`) {
    throw new Error("Invalid admin context subject");
  }
  return Object.freeze({
    iss: ADMIN_CONTEXT_ISSUER,
    aud: ADMIN_CONTEXT_AUDIENCE,
    sub: value.sub,
    jti: value.jti,
    iat: value.iat,
    exp: value.exp,
    tokenUse: "admin_context",
    schemaVersion: 1,
    ...resolved,
  });
}

function parsePermission(value: unknown): AdminPermission {
  if (
    !isRecord(value) ||
    typeof value.domain !== "string" ||
    typeof value.resource !== "string" ||
    typeof value.action !== "string"
  ) {
    throw new Error("Invalid admin context permission");
  }
  const validated = validateAuthorizeInput({
    domain: value.domain,
    resource: value.resource,
    action: value.action,
  });
  if (!validated.success) {
    throw new Error("Invalid admin context permission");
  }
  return Object.freeze({
    domain: validated.data.domain,
    resource: validated.data.resource,
    action: validated.data.action as Action,
  });
}

function parseUser(value: unknown): ContextUser {
  if (!isRecord(value)) {
    throw new Error("Invalid admin context user");
  }
  const email = value.email;
  if (email !== undefined && (typeof email !== "string" || !email || email.length > 320)) {
    throw new Error("Invalid admin context user");
  }
  return Object.freeze({
    id: requiredString(value, "id", 255),
    name: requiredString(value, "name", 1_024),
    ...(email ? { email } : {}),
  });
}

function parseStore(value: unknown): ContextStore {
  if (!isRecord(value)) {
    throw new Error("Invalid admin context store");
  }
  const email = value.email;
  const locales = value.locales;
  if (
    (email !== null && (typeof email !== "string" || !email || email.length > 320)) ||
    !Array.isArray(locales) ||
    locales.length === 0 ||
    locales.length > 100 ||
    !locales.every(
      (locale) => typeof locale === "string" && locale.length > 0 && locale.length <= 255,
    ) ||
    new Set(locales).size !== locales.length
  ) {
    throw new Error("Invalid admin context store");
  }
  const store = {
    id: requiredString(value, "id", 255),
    name: requiredString(value, "name", 255),
    displayName: requiredString(value, "displayName", 1_024),
    organizationId: requiredString(value, "organizationId", 255),
    timezone: requiredString(value, "timezone", 255),
    email,
    defaultLocale: requiredString(value, "defaultLocale", 255),
    locales: Object.freeze([...locales] as string[]),
    currencyCode: requiredString(value, "currencyCode", 255),
    segmentConfigurationRevision: requiredInteger(
      value,
      "segmentConfigurationRevision",
      0,
      Number.MAX_SAFE_INTEGER,
    ),
  };
  if (!store.locales.includes(store.defaultLocale)) {
    throw new Error("Invalid admin context store");
  }
  return Object.freeze(store);
}

function requiredInteger(
  value: Record<string, unknown>,
  key: string,
  minimum: number,
  maximum: number,
): number {
  const current = value[key];
  if (
    !Number.isSafeInteger(current) ||
    (current as number) < minimum ||
    (current as number) > maximum
  ) {
    throw new Error("Invalid admin context store");
  }
  return current as number;
}

function permissionKey(permission: {
  readonly domain: string;
  readonly resource: string;
  readonly action: string;
}): string {
  return `${permission.domain}\0${permission.resource}\0${permission.action}`;
}

function requiredString(value: Record<string, unknown>, key: string, maxLength: number): string {
  const current = value[key];
  if (typeof current !== "string" || current.length === 0 || current.length > maxLength) {
    throw new Error("Invalid admin context resolver response");
  }
  return current;
}

function nullableString(value: unknown, maxLength: number): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || value.length === 0 || value.length > maxLength) {
    throw new Error("Invalid admin context resolver response");
  }
  return value;
}

function requiredBoolean(value: Record<string, unknown>, key: string): boolean {
  const current = value[key];
  if (typeof current !== "boolean") {
    throw new Error("Invalid admin context resolver response");
  }
  return current;
}

function parseObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as unknown;
    if (!isRecord(parsed)) throw new Error();
    return parsed;
  } catch {
    throw new Error("Invalid admin context encoding");
  }
}

function normalizeKey(value: string): string | Buffer {
  return value.includes("BEGIN PUBLIC KEY") ? value : Buffer.from(value, "base64");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
