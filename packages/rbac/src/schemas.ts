import { z } from "zod";
import { RBAC } from "./definitions.js";

// === Domain Schemas ===

export const Org8nDomainSchema = z.literal("org8n");
export const StoreWildcardDomainSchema = z.literal("store:*");
export const StoreIdDomainSchema = z.string().regex(/^store:[a-zA-Z0-9-]+$/);
export const DomainSchema = z.union([Org8nDomainSchema, StoreWildcardDomainSchema, StoreIdDomainSchema]);

// === Permission Schemas ===

const org8nResourceNames = Object.keys(RBAC.resources["org8n"]) as [string, ...string[]];
const storeResourceNames = Object.keys(RBAC.resources["store:{id}"]) as [string, ...string[]];
const storeWildcardResourceNames = Object.keys(RBAC.resources["store:*"]) as [string, ...string[]];

export const Org8nPermissionSchema = z
  .object({
    resource: z.enum(org8nResourceNames),
    actions: z.array(z.string()).min(1),
  })
  .refine(
    (data) => {
      const res = RBAC.resources["org8n"][data.resource as keyof typeof RBAC.resources["org8n"]];
      return res && data.actions.every((a) => (res.actions as readonly string[]).includes(a));
    },
    { message: "Invalid action for org8n resource" }
  );

export const StoreWildcardPermissionSchema = z
  .object({
    resource: z.enum(storeWildcardResourceNames),
    actions: z.array(z.string()).min(1),
  })
  .refine(
    (data) => {
      const res = RBAC.resources["store:*"][data.resource as keyof typeof RBAC.resources["store:*"]];
      return res && data.actions.every((a) => (res.actions as readonly string[]).includes(a));
    },
    { message: "Invalid action for store:* resource" }
  );

export const StorePermissionSchema = z
  .object({
    resource: z.enum(storeResourceNames),
    actions: z.array(z.string()).min(1),
  })
  .refine(
    (data) => {
      const res = RBAC.resources["store:{id}"][data.resource as keyof typeof RBAC.resources["store:{id}"]];
      return res && data.actions.every((a) => (res.actions as readonly string[]).includes(a));
    },
    { message: "Invalid action for store resource" }
  );

// === Role Schemas ===

// Org role includes permissions for both "org8n" domain and "store:*" domain
export const Org8nRoleSchema = z.object({
  "org8n": z.array(Org8nPermissionSchema).min(1),
  "store:*": z.array(StoreWildcardPermissionSchema).optional(),
});

// Store role - permissions for specific store (domain: "store:{id}")
export const StoreRoleSchema = z.array(StorePermissionSchema).min(1);

// === Policy Schema ===

export const PolicySchema = z.object({
  subject: z.string().min(1),
  domain: DomainSchema,
  resource: z.string().min(1),
  action: z.string().min(1),
});

// === Types ===

export type Org8nPermission = z.infer<typeof Org8nPermissionSchema>;
export type StoreWildcardPermission = z.infer<typeof StoreWildcardPermissionSchema>;
export type StorePermission = z.infer<typeof StorePermissionSchema>;
export type Org8nRole = z.infer<typeof Org8nRoleSchema>;
export type StoreRole = z.infer<typeof StoreRoleSchema>;
export type Policy = z.infer<typeof PolicySchema>;
