import { GraphQLError } from "graphql";
import type { ContextStorefrontAccess } from "./storefrontAccessContext.js";

export const STOREFRONT_PERMISSIONS = {
  CATALOG_READ: "storefront.catalog.read",
  INVENTORY_READ: "storefront.inventory.read",
  CHECKOUT_READ: "storefront.checkout.read",
  CHECKOUT_WRITE: "storefront.checkout.write",
  CUSTOMER_READ: "storefront.customer.read",
  CUSTOMER_WRITE: "storefront.customer.write",
  ORDER_READ: "storefront.order.read",
  ORDER_WRITE: "storefront.order.write",
} as const;

export type StorefrontPermission =
  (typeof STOREFRONT_PERMISSIONS)[keyof typeof STOREFRONT_PERMISSIONS];

export const STOREFRONT_PERMISSION_VALUES = Object.freeze(
  Object.values(STOREFRONT_PERMISSIONS),
);

export function isStorefrontPermission(
  value: string,
): value is StorefrontPermission {
  return (STOREFRONT_PERMISSION_VALUES as readonly string[]).includes(value);
}

export function requireStorefrontPermission(
  context: ContextStorefrontAccess | undefined,
  permission: StorefrontPermission,
): void {
  if (!context?.permissions.includes(permission)) {
    throw new GraphQLError("Storefront permission is required", {
      extensions: { code: "FORBIDDEN" },
    });
  }
}
