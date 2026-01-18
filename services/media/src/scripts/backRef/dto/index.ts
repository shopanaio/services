export interface EntityRef {
  service: string;
  entityType: string;
  entityId: string;
}

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

export interface EntityDeletedParams {
  entityRef: EntityRef;
}

export interface EntityDeletedResult {
  unlinkedCount: number;
}
