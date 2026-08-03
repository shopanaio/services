import { defineAppManifest } from "@shopana/app-sdk";
import {
  STOREFRONT_PERMISSION_CATALOG,
  STOREFRONT_PERMISSIONS,
  STOREFRONT_PERMISSION_VALUES,
  validateStorefrontPermissionCatalog,
  type StorefrontPermission,
  type StorefrontPermissionDefinition,
} from "@shopana/storefront-permissions";

export const HEADLESS_STOREFRONT_DEFAULT_PERMISSIONS = [
  STOREFRONT_PERMISSIONS.CATALOG_READ,
  STOREFRONT_PERMISSIONS.INVENTORY_READ,
  STOREFRONT_PERMISSIONS.CHECKOUT_READ,
  STOREFRONT_PERMISSIONS.CHECKOUT_WRITE,
  STOREFRONT_PERMISSIONS.ORDER_WRITE,
  STOREFRONT_PERMISSIONS.REVIEWS_READ,
  STOREFRONT_PERMISSIONS.REVIEWS_WRITE,
] as const satisfies readonly StorefrontPermission[];

export interface StorefrontApiConfiguration {
  readonly permissions: readonly StorefrontPermissionDefinition[];
  readonly availablePermissions: readonly StorefrontPermission[];
  readonly defaultPermissions: readonly StorefrontPermission[];
}

export const headlessStorefrontApi =
  validateStorefrontApiConfiguration({
    permissions: STOREFRONT_PERMISSION_CATALOG,
    availablePermissions: STOREFRONT_PERMISSION_VALUES,
    defaultPermissions: HEADLESS_STOREFRONT_DEFAULT_PERMISSIONS,
  });

export const headlessManifest = defineAppManifest({
  schemaVersion: 2,
  code: "shopana-headless",
  version: "1.0.0",
  displayName: "Headless",
  description: "Custom storefronts using the Shopana Storefront API.",
  icon: {
    url: "/app-icons/headless.svg",
    alt: "Headless",
  },
  lifecycle: {
    installWorkflow: "install",
    updateWorkflow: "update",
    suspendAction: "suspend",
    resumeAction: "resume",
    uninstallWorkflow: "uninstall",
    healthAction: "health",
  },
  permissions: ["project.getStoreById"],
  capabilities: [],
  graphql: {
    admin: true,
    storefront: true,
  },
});

function validateStorefrontApiConfiguration(
  input: StorefrontApiConfiguration,
): StorefrontApiConfiguration {
  const permissionPattern =
    /^[a-z][a-z0-9]*(?:[.:_-][a-z0-9]+)*$/;
  const definitions = [...input.permissions];
  const available = [...input.availablePermissions];
  const defaults = [...input.defaultPermissions];

  validateStorefrontPermissionCatalog(definitions);
  assertValidPermissionList(
    available,
    "availablePermissions",
    permissionPattern,
  );
  assertValidPermissionList(
    defaults,
    "defaultPermissions",
    permissionPattern,
  );

  const definitionHandles = new Set(
    definitions.map(({ handle }) => handle),
  );
  const availableSet = new Set<string>(available);
  if (
    definitionHandles.size !== availableSet.size ||
    [...definitionHandles].some(
      (permission) => !availableSet.has(permission),
    )
  ) {
    throw new Error(
      "Storefront permission definitions and available permissions must match",
    );
  }

  for (const permission of defaults) {
    if (!availableSet.has(permission)) {
      throw new Error(
        `Default storefront permission "${permission}" is unavailable`,
      );
    }
  }

  return Object.freeze({
    permissions: Object.freeze(definitions),
    availablePermissions: Object.freeze(available),
    defaultPermissions: Object.freeze(defaults),
  });
}

function assertValidPermissionList(
  permissions: readonly string[],
  field: string,
  pattern: RegExp,
): void {
  const seen = new Set<string>();
  for (const permission of permissions) {
    if (!pattern.test(permission)) {
      throw new Error(
        `Invalid storefront permission "${permission}" in ${field}`,
      );
    }
    if (seen.has(permission)) {
      throw new Error(
        `Duplicate storefront permission "${permission}" in ${field}`,
      );
    }
    seen.add(permission);
  }
}
