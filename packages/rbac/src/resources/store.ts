import { z } from "zod";

export const StoreResources = {
  "store.profile": {
    actions: ["read", "update"],
    description: "Store profile",
  },
  "store.products": {
    actions: ["read", "create", "update", "delete"],
    description: "Product catalog",
  },
  "store.orders": {
    actions: ["read", "create", "update", "delete"],
    description: "Order management",
  },
  "store.inventory": {
    actions: ["read", "create", "update", "delete"],
    description: "Inventory management",
  },
  "store.settings": {
    actions: ["read", "update"],
    description: "Store configuration",
  },
  "store.access": {
    actions: ["read", "grant", "revoke"],
    description: "Access control",
  },
} as const;

const storeResourceNames = Object.keys(StoreResources) as [string, ...string[]];

export const StoreResourceSchema = z.enum(storeResourceNames);

export const StorePermissionSchema = z
  .object({
    resource: StoreResourceSchema,
    actions: z.array(z.string()).min(1),
  })
  .refine(
    (data) => {
      const validActions = StoreResources[data.resource as keyof typeof StoreResources]?.actions;
      if (!validActions) return false;
      return data.actions.every((a) => (validActions as readonly string[]).includes(a));
    },
    { message: "Invalid action for store resource" }
  );
