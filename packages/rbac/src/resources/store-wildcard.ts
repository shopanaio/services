import { z } from "zod";

export const StoreWildcardResources = {
  "store.profile": {
    actions: ["list", "create", "delete"],
    description: "Store management (list, create, delete stores)",
  },
  "store.access": {
    actions: ["read", "grant", "revoke"],
    description: "Access control for any store",
  },
} as const;

const storeWildcardResourceNames = Object.keys(StoreWildcardResources) as [string, ...string[]];

export const StoreWildcardResourceSchema = z.enum(storeWildcardResourceNames);

export const StoreWildcardPermissionSchema = z
  .object({
    resource: StoreWildcardResourceSchema,
    actions: z.array(z.string()).min(1),
  })
  .refine(
    (data) => {
      const validActions = StoreWildcardResources[data.resource as keyof typeof StoreWildcardResources]?.actions;
      if (!validActions) return false;
      return data.actions.every((a) => (validActions as readonly string[]).includes(a));
    },
    { message: "Invalid action for store:* resource" }
  );
