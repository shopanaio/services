// === Domains ===
export { Domains, DomainSchema, OrgDomainSchema, StoreIdDomainSchema, StoreWildcardDomainSchema } from "./domains.js";

// === Resources ===
export { OrgResources, OrgResourceSchema, OrgPermissionSchema } from "./resources/org.js";
export { StoreResources, StoreResourceSchema, StorePermissionSchema } from "./resources/store.js";
export { StoreWildcardResources, StoreWildcardResourceSchema, StoreWildcardPermissionSchema } from "./resources/store-wildcard.js";

// === Roles ===
export { ORG_ROLES } from "./roles/org-roles.js";
export { STORE_ROLES } from "./roles/store-roles.js";
export { STORE_WILDCARD_ROLES } from "./roles/store-wildcard-roles.js";

// === Schemas ===
export {
  OrgRoleSchema,
  StoreRoleSchema,
  StoreWildcardRoleSchema,
  PolicySchema,
  PermissionSchema,
  type OrgRoleInput,
  type StoreRoleInput,
  type StoreWildcardRoleInput,
  type PolicyInput,
  type PermissionInput,
} from "./schemas/index.js";

// === Types ===
export type {
  Domain,
  Resource,
  Action,
  Permission,
  Role,
  RoleDefinition,
  Policy,
} from "./types.js";
