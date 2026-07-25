import { defineAppManifest } from "@shopana/app-sdk";

export const HEADLESS_STOREFRONT_CAPABILITY = "sales-channel";

export const HEADLESS_STOREFRONT_AVAILABLE_PERMISSIONS = [
  "storefront.catalog.read",
  "storefront.inventory.read",
  "storefront.content.read",
  "storefront.metaobjects.read",
  "storefront.cart.read",
  "storefront.cart.write",
  "storefront.customer.write",
] as const;

export const HEADLESS_STOREFRONT_DEFAULT_PERMISSIONS = [
  "storefront.catalog.read",
  "storefront.inventory.read",
  "storefront.cart.read",
  "storefront.cart.write",
] as const satisfies readonly HeadlessStorefrontPermission[];

export type HeadlessStorefrontPermission =
  (typeof HEADLESS_STOREFRONT_AVAILABLE_PERMISSIONS)[number];

export interface StorefrontApiConfiguration {
  readonly availablePermissions: readonly HeadlessStorefrontPermission[];
  readonly defaultPermissions: readonly HeadlessStorefrontPermission[];
}

export const headlessStorefrontApi =
  validateStorefrontApiConfiguration({
    availablePermissions: HEADLESS_STOREFRONT_AVAILABLE_PERMISSIONS,
    defaultPermissions: HEADLESS_STOREFRONT_DEFAULT_PERMISSIONS,
  });

export const headlessManifest = defineAppManifest({
  schemaVersion: 2,
  code: "shopana-headless",
  version: "1.0.0",
  displayName: "Headless",
  description: "Custom storefronts using the Shopana Storefront API.",
  lifecycle: {
    installWorkflow: "install",
    updateWorkflow: "update",
    suspendAction: "suspend",
    resumeAction: "resume",
    uninstallWorkflow: "uninstall",
    healthAction: "health",
  },
  permissions: [],
  capabilities: [
    {
      key: HEADLESS_STOREFRONT_CAPABILITY,
      assignmentMode: "resource",
      operations: {
        connect: "channelConnect",
        update: "channelUpdate",
        suspend: "channelSuspend",
        resume: "channelResume",
        disconnect: "channelDisconnect",
        health: "channelHealth",
      },
    },
  ],
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
  const available = [...input.availablePermissions];
  const defaults = [...input.defaultPermissions];

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

  const availableSet = new Set(available);
  for (const permission of defaults) {
    if (!availableSet.has(permission)) {
      throw new Error(
        `Default storefront permission "${permission}" is unavailable`,
      );
    }
  }

  return Object.freeze({
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
