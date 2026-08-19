import { z } from "zod";

export const mediaSourceCreateSchema = z.object({
  mediaFileId: z.string().trim().min(1, "mediaFileId is required"),
  sourceFileId: z.string().trim().min(1, "sourceFileId is required"),
  kind: z.string().trim().min(1, "kind is required").max(64),
  format: z.string().trim().min(1, "format is required").max(64),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});

export const mediaSourceUpdateSchema = z.object({
  mediaFileId: z.string().trim().min(1, "mediaFileId is required"),
  sourceFileId: z.string().trim().min(1, "sourceFileId is required"),
  kind: z.string().trim().min(1).max(64).optional(),
  format: z.string().trim().min(1).max(64).optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});

export const mediaSourceDeleteSchema = z.object({
  mediaFileId: z.string().trim().min(1, "mediaFileId is required"),
  sourceFileId: z.string().trim().min(1, "sourceFileId is required"),
});
