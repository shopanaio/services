import { z } from "zod";
import type { FileResultBase } from "./shared.js";

export const fileUploadFromUrlSchema = z.object({
  sourceUrl: z.string().trim().min(1, "sourceUrl is required").max(2048),
  altText: z.string().trim().max(1024).optional(),
  idempotencyKey: z.string().trim().min(1).max(255).optional(),
});

export interface FileUploadFromUrlParams {
  readonly sourceUrl: string;
  readonly altText?: string;
  readonly idempotencyKey?: string;
  // ownerId is taken from store context (this.storeId)
}

export interface FileUploadFromUrlResult extends FileResultBase {
  file: { id: string } | null;
}
