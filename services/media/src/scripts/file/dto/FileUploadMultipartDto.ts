import type { FileUpload } from "graphql-upload-minimal";
import { z } from "zod";
import type { FileResultBase } from "./shared.js";

export const fileUploadMultipartSchema = z.object({
  file: z.any(),
  altText: z.string().trim().max(1024).optional(),
  idempotencyKey: z.string().trim().min(1).max(255).optional(),
});

export interface FileUploadMultipartParams {
  file: Promise<FileUpload>;
  altText?: string;
  idempotencyKey?: string;
  // ownerId is taken from store context (this.storeId)
}

export interface FileUploadMultipartResult extends FileResultBase {
  file: { id: string } | null;
}
