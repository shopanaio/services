import { z } from "zod";
import {
  OrgDomainSchema,
  StoreWildcardDomainSchema,
  StoreIdDomainSchema,
  DomainSchema,
} from "../domains.js";
import { OrgPermissionSchema } from "../resources/org.js";
import { StorePermissionSchema } from "../resources/store.js";
import { StoreWildcardPermissionSchema } from "../resources/store-wildcard.js";

// Re-export domain schemas
export {
  OrgDomainSchema,
  StoreWildcardDomainSchema,
  StoreIdDomainSchema,
  DomainSchema,
} from "../domains.js";

// Re-export permission schemas
export { OrgPermissionSchema } from "../resources/org.js";
export { StorePermissionSchema } from "../resources/store.js";
export { StoreWildcardPermissionSchema } from "../resources/store-wildcard.js";

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

// === Generic Permission Schema (structure only) ===

export const PermissionSchema = z.object({
  resource: z.string().min(1),
  actions: z.array(z.string()).min(1),
});

// === Types ===

export type OrgRoleInput = z.infer<typeof OrgRoleSchema>;
export type StoreRoleInput = z.infer<typeof StoreRoleSchema>;
export type StoreWildcardRoleInput = z.infer<typeof StoreWildcardRoleSchema>;
export type PolicyInput = z.infer<typeof PolicySchema>;
export type PermissionInput = z.infer<typeof PermissionSchema>;
