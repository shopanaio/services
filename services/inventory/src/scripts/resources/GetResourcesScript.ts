import type { GetResourcesResult } from "@shopana/shared-kernel";

/**
 * Returns the list of resources and actions exposed by the inventory service.
 * Used by IAM service for resource discovery.
 */
export async function getResources(): Promise<GetResourcesResult> {
  return {
    service: "inventory",
    displayName: "Inventory",
    resources: [
      {
        name: "product",
        displayName: "Products",
        description: "Product catalog management",
        actions: [
          { name: "create", displayName: "Create", description: "Create new products" },
          { name: "read", displayName: "View", description: "View product details" },
          { name: "update", displayName: "Edit", description: "Edit product information" },
          { name: "delete", displayName: "Delete", description: "Delete products" },
          { name: "publish", displayName: "Publish", description: "Publish products to storefront" },
          { name: "unpublish", displayName: "Unpublish", description: "Remove products from storefront" },
        ],
      },
      {
        name: "category",
        displayName: "Categories",
        description: "Product categories management",
        actions: [
          { name: "create", displayName: "Create", description: "Create new categories" },
          { name: "read", displayName: "View", description: "View categories" },
          { name: "update", displayName: "Edit", description: "Edit categories" },
          { name: "delete", displayName: "Delete", description: "Delete categories" },
        ],
      },
      {
        name: "collection",
        displayName: "Collections",
        description: "Product collections management",
        actions: [
          { name: "create", displayName: "Create", description: "Create new collections" },
          { name: "read", displayName: "View", description: "View collections" },
          { name: "update", displayName: "Edit", description: "Edit collections" },
          { name: "delete", displayName: "Delete", description: "Delete collections" },
        ],
      },
      {
        name: "warehouse",
        displayName: "Warehouses",
        description: "Warehouse and stock location management",
        actions: [
          { name: "create", displayName: "Create", description: "Create new warehouses" },
          { name: "read", displayName: "View", description: "View warehouses" },
          { name: "update", displayName: "Edit", description: "Edit warehouse settings" },
          { name: "delete", displayName: "Delete", description: "Delete warehouses" },
        ],
      },
      {
        name: "stock",
        displayName: "Stock",
        description: "Inventory stock management",
        actions: [
          { name: "read", displayName: "View", description: "View stock levels" },
          { name: "update", displayName: "Adjust", description: "Adjust stock quantities" },
        ],
      },
    ],
  };
}
