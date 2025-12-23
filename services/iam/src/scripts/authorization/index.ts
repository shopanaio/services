// Authorization check scripts
export { AuthorizeScript } from "./AuthorizeScript.js";
export { BatchAuthorizeScript } from "./BatchAuthorizeScript.js";
export { GetUserRoleScript } from "./GetUserRoleScript.js";

// User-role assignment scripts
export { AttachUserRoleScript } from "./AttachUserRoleScript.js";
export { DetachUserRoleScript } from "./DetachUserRoleScript.js";

// Role management scripts
export { CreateRoleScript } from "./CreateRoleScript.js";
export { UpdateRoleScript } from "./UpdateRoleScript.js";
export { DeleteRoleScript } from "./DeleteRoleScript.js";
export { ListRolesScript } from "./ListRolesScript.js";

export type {
  // Authorization types
  AuthorizeParams,
  AuthorizeResult,
  BatchAuthorizeParams,
  BatchAuthorizeResult,
  GetUserRoleParams,
  GetUserRoleResult,
  // User-role assignment types
  AttachUserRoleParams,
  AttachUserRoleResult,
  DetachUserRoleParams,
  DetachUserRoleResult,
  ListOrgMembersParams,
  ListOrgMembersResult,
  OrgMember,
  // Role management types
  RolePermission,
  RoleInfo,
  CreateRoleParams,
  CreateRoleResult,
  UpdateRoleParams,
  UpdateRoleResult,
  DeleteRoleParams,
  DeleteRoleResult,
  ListRolesParams,
  ListRolesResult,
  GetRoleParams,
  GetRoleResult,
} from "./dto/index.js";
