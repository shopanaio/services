import {
  isStorefrontPermission,
  type StorefrontPermission,
} from "@shopana/shared-context";

export interface ResolvedStorefrontAccessContext {
  readonly store: {
    readonly id: string;
    readonly name: string;
    readonly displayName: string;
    readonly organizationId: string;
    readonly timezone: string;
    readonly email: string | null;
    readonly defaultLocale: string;
    readonly locales: readonly string[];
    readonly currencyCode: string;
  };
  readonly access: {
    readonly connectionId: string;
    readonly installationId: string;
    readonly credentialId: string;
    readonly mode: "PUBLIC" | "PRIVATE";
    readonly permissions: readonly StorefrontPermission[];
    readonly policyRevision: number;
  };
}

export function parseResolvedStorefrontAccessContext(
  value: unknown,
  expectedMode: "PUBLIC" | "PRIVATE",
): ResolvedStorefrontAccessContext {
  if (!isRecord(value) || !isRecord(value.store) || !isRecord(value.access)) {
    throw new Error("Invalid storefront resolver response");
  }
  const store = value.store;
  const access = value.access;
  const email = store.email;
  const locales = store.locales;
  const permissions = access.permissions;
  if (
    (email !== null && typeof email !== "string") ||
    !Array.isArray(locales) ||
    locales.length === 0 ||
    locales.length > 100 ||
    !locales.every(isNonEmptyString) ||
    new Set(locales).size !== locales.length ||
    !Array.isArray(permissions) ||
    !permissions.every(
      (permission) =>
        typeof permission === "string" &&
        isStorefrontPermission(permission),
    ) ||
    new Set(permissions).size !== permissions.length ||
    access.mode !== expectedMode ||
    !Number.isInteger(access.policyRevision) ||
    (access.policyRevision as number) < 1
  ) {
    throw new Error("Invalid storefront resolver response");
  }

  const parsedStore = {
    id: requiredString(store, "id"),
    name: requiredString(store, "name"),
    displayName: requiredString(store, "displayName"),
    organizationId: requiredString(store, "organizationId"),
    timezone: requiredString(store, "timezone"),
    email,
    defaultLocale: requiredString(store, "defaultLocale"),
    locales: Object.freeze([...locales] as string[]),
    currencyCode: requiredString(store, "currencyCode"),
  };
  if (!parsedStore.locales.includes(parsedStore.defaultLocale)) {
    throw new Error("Invalid storefront resolver response");
  }

  return Object.freeze({
    store: Object.freeze(parsedStore),
    access: Object.freeze({
      connectionId: requiredString(access, "connectionId"),
      installationId: requiredString(access, "installationId"),
      credentialId: requiredString(access, "credentialId"),
      mode: expectedMode,
      permissions: Object.freeze(
        [...permissions] as StorefrontPermission[],
      ),
      policyRevision: access.policyRevision as number,
    }),
  });
}

function requiredString(
  value: Record<string, unknown>,
  key: string,
): string {
  const current = value[key];
  if (
    typeof current !== "string" ||
    current.length === 0 ||
    current.length > 1_024
  ) {
    throw new Error("Invalid storefront resolver response");
  }
  return current;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 255;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
