import {
  STOREFRONT_PERMISSION_VALUES,
  type StorefrontPermission,
  type StorefrontPermissionDefinition,
} from "./definitions.js";

const STOREFRONT_PERMISSION_PATTERN =
  /^[a-z][a-z0-9]*(?:[.:_-][a-z0-9]+)*$/;

export function isStorefrontPermission(
  value: string,
): value is StorefrontPermission {
  return (STOREFRONT_PERMISSION_VALUES as readonly string[]).includes(value);
}

export function validateStorefrontPermissionCatalog(
  definitions: readonly StorefrontPermissionDefinition[],
): void {
  const handles = new Set<string>();

  for (const definition of definitions) {
    if (!STOREFRONT_PERMISSION_PATTERN.test(definition.handle)) {
      throw new Error(
        `Invalid storefront permission "${definition.handle}"`,
      );
    }
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
    if (handles.has(definition.handle)) {
      throw new Error(
        `Duplicate storefront permission definition "${definition.handle}"`,
      );
    }
    handles.add(definition.handle);
  }

  if (
    handles.size !== STOREFRONT_PERMISSION_VALUES.length ||
    STOREFRONT_PERMISSION_VALUES.some(
      (permission) => !handles.has(permission),
    )
  ) {
    throw new Error(
      "Storefront permission definitions and permission values must match",
    );
  }
}
