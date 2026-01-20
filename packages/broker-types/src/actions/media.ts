/**
 * Media service broker action types
 */
import type { EntityRef, UserError, AssetOwnerType } from "../shared.js";

// ============================================================================
// AssetGroup Actions
// ============================================================================

export interface CreateAssetGroupParams {
  ownerType: AssetOwnerType;
  ownerId: string;
}

export interface CreateAssetGroupResult {
  assetGroup: {
    id: string;
    ownerType: string;
    ownerId: string;
  } | null;
  userErrors: UserError[];
}

export interface DeleteAssetGroupParams {
  ownerType: AssetOwnerType;
  ownerId: string;
}

export interface DeleteAssetGroupResult {
  deletedAssetGroupId: string | null;
  userErrors: UserError[];
}

export interface GetAssetGroupParams {
  ownerType: AssetOwnerType;
  ownerId: string;
}

export interface GetAssetGroupResult {
  assetGroup: {
    id: string;
    ownerType: string;
    ownerId: string;
  } | null;
  userErrors: UserError[];
}

// ============================================================================
// File Link/Unlink Actions
// ============================================================================

export interface FileLinkParams {
  fileId: string;
  entityRef: EntityRef;
  role: string;
}

export interface FileLinkResult {
  success: boolean;
  activeRefCount: number;
  fileExists: boolean;
  fileActive: boolean;
}

export interface FileUnlinkParams {
  fileId: string;
  entityRef: EntityRef;
  role: string;
}

export interface FileUnlinkResult {
  success: boolean;
  activeRefCount: number;
  fileExists: boolean;
  fileActive: boolean;
}

// ============================================================================
// Batch File Link/Unlink Actions
// ============================================================================

export interface FileLinkItem {
  fileId: string;
  role: string;
}

export interface FileLinkManyParams {
  items: FileLinkItem[];
  entityRef: EntityRef;
}

export interface FileLinkManyResult {
  linkedCount: number;
  skippedCount: number;
}

export interface FileUnlinkManyParams {
  items: FileLinkItem[];
  entityRef: EntityRef;
}

export interface FileUnlinkManyResult {
  unlinkedCount: number;
  skippedCount: number;
}

// ============================================================================
// Entity Deleted / Sync Actions
// ============================================================================

export interface EntityDeletedParams {
  entityRef: EntityRef;
}

export interface EntityDeletedResult {
  unlinkedCount: number;
}

export interface SyncEntityFilesParams {
  entityRef: EntityRef;
  fileIds: string[];
  role?: string;
}

export interface SyncEntityFilesResult {
  unlinkedCount: number;
  linkedCount: number;
  skippedCount: number;
}
