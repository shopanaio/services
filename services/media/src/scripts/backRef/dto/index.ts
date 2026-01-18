import { z } from "zod";

// ---- Zod Schemas ----

export const entityRefSchema = z.object({
  service: z.string().min(1).max(64),
  entityType: z.string().min(1).max(64),
  entityId: z.string().min(1).max(255),
});

export const fileLinkItemSchema = z.object({
  fileId: z.string().uuid(),
  role: z.string().min(1).max(32),
});

export const fileLinkSchema = z.object({
  fileId: z.string().uuid(),
  entityRef: entityRefSchema,
  role: z.string().min(1).max(32),
});

export const fileUnlinkSchema = z.object({
  fileId: z.string().uuid(),
  entityRef: entityRefSchema,
  role: z.string().min(1).max(32),
});

export const fileLinkManySchema = z.object({
  items: z.array(fileLinkItemSchema).max(1000),
  entityRef: entityRefSchema,
});

export const fileUnlinkManySchema = z.object({
  items: z.array(fileLinkItemSchema).max(1000),
  entityRef: entityRefSchema,
});

export const entityDeletedSchema = z.object({
  entityRef: entityRefSchema,
});

// ---- Interfaces ----

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
