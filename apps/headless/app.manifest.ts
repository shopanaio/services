import { defineAppManifest } from "@shopana/app-sdk";
import {
  STOREFRONT_PERMISSIONS,
  STOREFRONT_PERMISSION_VALUES,
  type StorefrontPermission,
} from "@shopana/shared-context";

export type HeadlessStorefrontPermissionAction = "read" | "write";
export type HeadlessStorefrontPermissionRisk =
  | "LOW"
  | "MEDIUM"
  | "HIGH";

export interface HeadlessStorefrontPermissionDefinition {
  readonly handle: StorefrontPermission;
  readonly resource: string;
  readonly action: HeadlessStorefrontPermissionAction;
  readonly label: string;
  readonly description: string;
  readonly risk: HeadlessStorefrontPermissionRisk;
}

export const HEADLESS_STOREFRONT_PERMISSION_CATALOG = [
  {
    handle: STOREFRONT_PERMISSIONS.CATALOG_READ,
    resource: "catalog",
    action: "read",
    label: "Read catalog",
    description:
      "View published products, variants, categories, bundles, prices, and storefront publication data.",
    risk: "LOW",
  },
  {
    handle: STOREFRONT_PERMISSIONS.INVENTORY_READ,
    resource: "inventory",
    action: "read",
    label: "Read inventory",
    description:
      "View storefront availability for published products and variants.",
    risk: "LOW",
  },
  {
    handle: STOREFRONT_PERMISSIONS.CHECKOUT_READ,
    resource: "checkout",
    action: "read",
    label: "Read checkouts",
    description:
      "View buyer-owned carts and their checkout state.",
    risk: "MEDIUM",
  },
  {
    handle: STOREFRONT_PERMISSIONS.CHECKOUT_WRITE,
    resource: "checkout",
    action: "write",
    label: "Write checkouts",
    description:
      "Create carts and update their lines, buyer identity, addresses, delivery, payment, promotions, and checkout state.",
    risk: "HIGH",
  },
  {
    handle: STOREFRONT_PERMISSIONS.CUSTOMER_READ,
    resource: "customer",
    action: "read",
    label: "Read customer",
    description:
      "View the authenticated customer's profile, addresses, and marketing preferences.",
    risk: "HIGH",
  },
  {
    handle: STOREFRONT_PERMISSIONS.CUSTOMER_WRITE,
    resource: "customer",
    action: "write",
    label: "Write customer",
    description:
      "Update the authenticated customer's profile, addresses, and marketing preferences.",
    risk: "HIGH",
  },
  {
    handle: STOREFRONT_PERMISSIONS.ORDER_READ,
    resource: "order",
    action: "read",
    label: "Read orders",
    description:
      "View the authenticated customer's order history and order details.",
    risk: "HIGH",
  },
  {
    handle: STOREFRONT_PERMISSIONS.ORDER_WRITE,
    resource: "order",
    action: "write",
    label: "Write orders",
    description:
      "Create an order from a buyer-owned checkout.",
    risk: "HIGH",
  },
] as const;

export type HeadlessStorefrontPermission = StorefrontPermission;

export const HEADLESS_STOREFRONT_AVAILABLE_PERMISSIONS = Object.freeze(
  STOREFRONT_PERMISSION_VALUES,
) satisfies readonly HeadlessStorefrontPermission[];

export const HEADLESS_STOREFRONT_DEFAULT_PERMISSIONS = [
  STOREFRONT_PERMISSIONS.CATALOG_READ,
  STOREFRONT_PERMISSIONS.INVENTORY_READ,
  STOREFRONT_PERMISSIONS.CHECKOUT_READ,
  STOREFRONT_PERMISSIONS.CHECKOUT_WRITE,
  STOREFRONT_PERMISSIONS.ORDER_WRITE,
] as const satisfies readonly HeadlessStorefrontPermission[];

export interface StorefrontApiConfiguration {
  readonly permissions: readonly HeadlessStorefrontPermissionDefinition[];
  readonly availablePermissions: readonly HeadlessStorefrontPermission[];
  readonly defaultPermissions: readonly HeadlessStorefrontPermission[];
}

export const headlessStorefrontApi =
  validateStorefrontApiConfiguration({
    permissions: HEADLESS_STOREFRONT_PERMISSION_CATALOG,
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

  const definitionHandles = new Set<string>();
  for (const definition of definitions) {
    if (
      definition.handle !==
      `storefront.${definition.resource}.${definition.action}`
    ) {
      throw new Error(
        `Storefront permission "${definition.handle}" does not match its resource and action`,
      );
    }
    if (!definition.label.trim() || !definition.description.trim()) {
      throw new Error(
        `Storefront permission "${definition.handle}" requires label and description`,
      );
    }
    if (definitionHandles.has(definition.handle)) {
      throw new Error(
        `Duplicate storefront permission definition "${definition.handle}"`,
      );
    }
    definitionHandles.add(definition.handle);
  }

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
