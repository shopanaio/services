import { z } from "zod";
import { Resources } from "./definitions.js";

// === Domain Schemas ===

export const OrgDomainSchema = z.literal("org");
export const StoreDomainSchema = z.string().regex(/^store:[a-zA-Z0-9-]+$/);
export const DomainSchema = z.union([OrgDomainSchema, StoreDomainSchema]);

// === Permission Schemas ===

const orgResourceNames = Object.keys(Resources.org) as [string, ...string[]];
const storeResourceNames = Object.keys(Resources.store) as [string, ...string[]];

export const OrgPermissionSchema = z
  .object({
    resource: z.enum(orgResourceNames),
    actions: z.array(z.string()).min(1),
  })
  .refine(
    (data) => {
      const res = Resources.org[data.resource as keyof typeof Resources.org];
      if (!res) return false;
      return data.actions.every(
        (a) => a === "*" || (res.actions as readonly string[]).includes(a)
      );
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
      const res = Resources.store[data.resource as keyof typeof Resources.store];
      if (!res) return false;
      return data.actions.every(
        (a) => a === "*" || (res.actions as readonly string[]).includes(a)
      );
    },
    { message: "Invalid action for store resource" }
  );

// === Role Schemas ===

export const OrgRoleSchema = z.array(OrgPermissionSchema).min(1);
export const StoreRoleSchema = z.array(StorePermissionSchema).min(1);

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
export type OrgRole = z.infer<typeof OrgRoleSchema>;
export type StoreRole = z.infer<typeof StoreRoleSchema>;
export type Policy = z.infer<typeof PolicySchema>;
