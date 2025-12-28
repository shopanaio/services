import { z } from "zod";
import { RBAC } from "./definitions.js";

// === Domain Schemas ===

export const OrgDomainSchema = z.literal("org");
export const StoreWildcardDomainSchema = z.literal("store:*");
export const StoreIdDomainSchema = z.string().regex(/^store:[a-zA-Z0-9-]+$/);
export const DomainSchema = z.union([OrgDomainSchema, StoreWildcardDomainSchema, StoreIdDomainSchema]);

// === Permission Schemas ===

const orgResourceNames = Object.keys(RBAC.resources.org) as [string, ...string[]];
const storeResourceNames = Object.keys(RBAC.resources.store) as [string, ...string[]];
const storeWildcardResourceNames = Object.keys(RBAC.resources.storeWildcard) as [string, ...string[]];

export const OrgPermissionSchema = z
  .object({
    resource: z.enum(orgResourceNames),
    actions: z.array(z.string()).min(1),
  })
  .refine(
    (data) => {
      const res = RBAC.resources.org[data.resource as keyof typeof RBAC.resources.org];
      return res && data.actions.every((a) => (res.actions as readonly string[]).includes(a));
    },
    { message: "Invalid action for org resource" }
  );

export const StorePermissionSchema = z
  .object({
    resource: z.enum(storeResourceNames),
    actions: z.array(z.string()).min(1),
  })
  .refine(
    (data) => {
      const res = RBAC.resources.store[data.resource as keyof typeof RBAC.resources.store];
      return res && data.actions.every((a) => (res.actions as readonly string[]).includes(a));
    },
    { message: "Invalid action for store resource" }
  );

export const StoreWildcardPermissionSchema = z
  .object({
    resource: z.enum(storeWildcardResourceNames),
    actions: z.array(z.string()).min(1),
  })
  .refine(
    (data) => {
      const res = RBAC.resources.storeWildcard[data.resource as keyof typeof RBAC.resources.storeWildcard];
      return res && data.actions.every((a) => (res.actions as readonly string[]).includes(a));
    },
    { message: "Invalid action for store:* resource" }
  );

// === Role Schemas ===

export const OrgRoleSchema = z.object({
  domain: OrgDomainSchema,
  permissions: z.array(OrgPermissionSchema).min(1),
});

export const StoreRoleSchema = z.object({
  domain: StoreIdDomainSchema,
  permissions: z.array(StorePermissionSchema).min(1),
});

export const StoreWildcardRoleSchema = z.object({
  domain: StoreWildcardDomainSchema,
  permissions: z.array(StoreWildcardPermissionSchema).min(1),
});

// === Policy Schema ===

export const PolicySchema = z.object({
  subject: z.string().min(1),
  domain: DomainSchema,
  resource: z.string().min(1),
  action: z.string().min(1),
});

// === Types ===

export type OrgPermission = z.infer<typeof OrgPermissionSchema>;
export type StorePermission = z.infer<typeof StorePermissionSchema>;
export type StoreWildcardPermission = z.infer<typeof StoreWildcardPermissionSchema>;
export type OrgRole = z.infer<typeof OrgRoleSchema>;
export type StoreRole = z.infer<typeof StoreRoleSchema>;
export type StoreWildcardRole = z.infer<typeof StoreWildcardRoleSchema>;
export type Policy = z.infer<typeof PolicySchema>;
