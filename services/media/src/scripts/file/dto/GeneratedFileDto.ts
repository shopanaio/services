import type { Media } from "@shopana/broker-types";
import { z } from "zod";

export type UploadGeneratedFileParams = Media.UploadGeneratedFileParams;
export type UploadGeneratedFileResult = Media.UploadGeneratedFileResult;
export type DeleteOwnedFilesParams = Media.DeleteOwnedFilesParams;
export type DeleteOwnedFilesResult = Media.DeleteOwnedFilesResult;

const ownerSchema = z.object({
  type: z.enum(["organization", "store", "user_profile"]),
  id: z.string().min(1).max(255),
});

export const uploadGeneratedFileSchema = z.object({
  owner: ownerSchema,
  entityRef: z.object({
    service: z.string().min(1).max(64),
    entityType: z.string().min(1).max(128),
    entityId: z.string().min(1).max(255),
  }),
  role: z.string().min(1).max(128),
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(127),
  contentBase64: z
    .string()
    .min(1)
    .max(24 * 1024 * 1024),
  idempotencyKey: z.string().min(1).max(255),
});

export const deleteOwnedFilesSchema = z.object({
  owner: ownerSchema,
  fileIds: z.array(z.string().uuid()).max(100),
  permanent: z.boolean().optional(),
});
