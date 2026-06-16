import type { FileUpload } from "graphql-upload-minimal";
import type { FileResultBase } from "./shared.js";

export interface FileUploadMultipartParams {
  file: Promise<FileUpload>;
  altText?: string;
  idempotencyKey?: string;
  // ownerId is taken from store context (this.storeId)
}

export interface FileUploadMultipartResult extends FileResultBase {
  file: { id: string } | null;
}
