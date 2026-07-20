export { Resources, Roles, RolesMeta, RBAC, Actions } from "./definitions.js";
export type { Action, Permission } from "./definitions.js";
export {
  validateDomainPermissions,
  validateAuthorizeInput,
  getActionsForResource,
  OrgResources,
  StoreResources,
  AllResources,
} from "./validators.js";

export type { Domain, OrgDomain, StoreDomain, OrgRoleName, StoreRoleName, RuntimePermission } from "./types.js";
export type {
  DomainPermissions,
  ValidationResult,
  AuthorizeInput,
  ValidatedAuthorizeInput,
  ResourceName,
} from "./validators.js";
export type { RoleMeta } from "./definitions.js";

// Authorization types
export type {
  ActionsForResource,
  AuthorizeParams,
  BrokerAuthorizeParams,
  AuthProvider,
  Authorizable,
  BasePolicyOptions,
  LinkedOwnerRef,
  ProtectedResourceRef,
  ServiceLinkedAuthorizationDetails,
  ServiceAwareAuthorizeParams,
} from "./auth.js";
export { ServiceLinkedResourceAuthorizationError } from "./auth.js";
