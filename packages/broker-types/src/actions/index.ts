/**
 * Broker action types - organized by service
 */

// Shared types
export type { EntityRef, UserError, AssetOwnerType } from "../shared.js";

// Media service actions
export * as Media from "./media.js";
export type {
  // AssetGroup
  CreateAssetGroupParams,
  CreateAssetGroupResult,
  DeleteAssetGroupParams,
  DeleteAssetGroupResult,
  GetAssetGroupParams,
  GetAssetGroupResult,
  // File Link/Unlink
  FileLinkParams,
  FileLinkResult,
  FileUnlinkParams,
  FileUnlinkResult,
  FileLinkItem,
  FileLinkManyParams,
  FileLinkManyResult,
  FileUnlinkManyParams,
  FileUnlinkManyResult,
  // Entity operations
  EntityDeletedParams,
  EntityDeletedResult,
  SyncEntityFilesParams,
  SyncEntityFilesResult,
} from "./media.js";

// IAM service actions
export * as IAM from "./iam.js";
export type {
  // Roles
  Permission,
  RoleConfig,
  CreateRolesParams,
  CreateRolesResult,
  AssignRoleParams,
  AssignRoleResult,
  // Authorization
  AuthorizeParams,
  AuthorizeResult,
  BatchAuthorizeRequest,
  BatchAuthorizeParams,
  BatchAuthorizeResult,
  // User
  GetCurrentUserParams,
  GetCurrentUserResult,
} from "./iam.js";

// Inventory service actions
export * as Inventory from "./inventory.js";
export type {
  FileHardDeletedParams,
  FileHardDeletedResult,
  GetOffersParams,
  OfferItem,
  GetOffersResult,
} from "./inventory.js";
