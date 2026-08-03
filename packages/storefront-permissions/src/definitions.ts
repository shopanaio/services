export const StorefrontPermissionActions = ["read", "write"] as const;

export type StorefrontPermissionAction =
  (typeof StorefrontPermissionActions)[number];

export const StorefrontPermissionRisks = [
  "LOW",
  "MEDIUM",
  "HIGH",
] as const;

export type StorefrontPermissionRisk =
  (typeof StorefrontPermissionRisks)[number];

interface StorefrontPermissionDefinitionInput {
  readonly handle: string;
  readonly resource: string;
  readonly action: StorefrontPermissionAction;
  readonly label: string;
  readonly description: string;
  readonly risk: StorefrontPermissionRisk;
}

export const StorefrontPermissionDefinitions = {
  CATALOG_READ: {
    handle: "storefront.catalog.read",
    resource: "catalog",
    action: "read",
    label: "Read catalog",
    description:
      "View published products, variants, categories, bundles, prices, and storefront publication data.",
    risk: "LOW",
  },
  INVENTORY_READ: {
    handle: "storefront.inventory.read",
    resource: "inventory",
    action: "read",
    label: "Read inventory",
    description:
      "View storefront availability for published products and variants.",
    risk: "LOW",
  },
  CHECKOUT_READ: {
    handle: "storefront.checkout.read",
    resource: "checkout",
    action: "read",
    label: "Read checkouts",
    description:
      "View buyer-owned carts and their checkout state.",
    risk: "MEDIUM",
  },
  CHECKOUT_WRITE: {
    handle: "storefront.checkout.write",
    resource: "checkout",
    action: "write",
    label: "Write checkouts",
    description:
      "Create carts and update their lines, buyer identity, addresses, delivery, payment, promotions, and checkout state.",
    risk: "HIGH",
  },
  CUSTOMER_READ: {
    handle: "storefront.customer.read",
    resource: "customer",
    action: "read",
    label: "Read customer",
    description:
      "View the authenticated customer's profile, addresses, and marketing preferences.",
    risk: "HIGH",
  },
  CUSTOMER_WRITE: {
    handle: "storefront.customer.write",
    resource: "customer",
    action: "write",
    label: "Write customer",
    description:
      "Update the authenticated customer's profile, addresses, and marketing preferences.",
    risk: "HIGH",
  },
  ORDER_READ: {
    handle: "storefront.order.read",
    resource: "order",
    action: "read",
    label: "Read orders",
    description:
      "View the authenticated customer's order history and order details.",
    risk: "HIGH",
  },
  ORDER_WRITE: {
    handle: "storefront.order.write",
    resource: "order",
    action: "write",
    label: "Write orders",
    description:
      "Create an order from a buyer-owned checkout.",
    risk: "HIGH",
  },
  REVIEWS_READ: {
    handle: "storefront.reviews.read",
    resource: "reviews",
    action: "read",
    label: "Read reviews",
    description:
      "View published product reviews, questions, answers, summaries, and buyer-owned review requests.",
    risk: "LOW",
  },
  REVIEWS_WRITE: {
    handle: "storefront.reviews.write",
    resource: "reviews",
    action: "write",
    label: "Write reviews",
    description:
      "Submit and manage buyer reviews, questions, answers, votes, reports, and subscriptions.",
    risk: "HIGH",
  },
} as const satisfies Record<string, StorefrontPermissionDefinitionInput>;

type StorefrontPermissionDefinitionName =
  keyof typeof StorefrontPermissionDefinitions;

export type StorefrontPermission = (typeof StorefrontPermissionDefinitions)[
  StorefrontPermissionDefinitionName
]["handle"];

export interface StorefrontPermissionDefinition {
  readonly handle: StorefrontPermission;
  readonly resource: string;
  readonly action: StorefrontPermissionAction;
  readonly label: string;
  readonly description: string;
  readonly risk: StorefrontPermissionRisk;
}

export const STOREFRONT_PERMISSIONS = Object.freeze({
  CATALOG_READ: StorefrontPermissionDefinitions.CATALOG_READ.handle,
  INVENTORY_READ: StorefrontPermissionDefinitions.INVENTORY_READ.handle,
  CHECKOUT_READ: StorefrontPermissionDefinitions.CHECKOUT_READ.handle,
  CHECKOUT_WRITE: StorefrontPermissionDefinitions.CHECKOUT_WRITE.handle,
  CUSTOMER_READ: StorefrontPermissionDefinitions.CUSTOMER_READ.handle,
  CUSTOMER_WRITE: StorefrontPermissionDefinitions.CUSTOMER_WRITE.handle,
  ORDER_READ: StorefrontPermissionDefinitions.ORDER_READ.handle,
  ORDER_WRITE: StorefrontPermissionDefinitions.ORDER_WRITE.handle,
  REVIEWS_READ: StorefrontPermissionDefinitions.REVIEWS_READ.handle,
  REVIEWS_WRITE: StorefrontPermissionDefinitions.REVIEWS_WRITE.handle,
});

export const STOREFRONT_PERMISSION_VALUES = Object.freeze(
  Object.values(STOREFRONT_PERMISSIONS),
);

export const STOREFRONT_PERMISSION_CATALOG = Object.freeze(
  Object.values(StorefrontPermissionDefinitions),
) satisfies readonly StorefrontPermissionDefinition[];
