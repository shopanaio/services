import type { FileUpload } from "graphql-upload-minimal";
import type { FileResultBase } from "./shared.js";

export interface FileUploadMultipartParams {
  readonly file: Promise<FileUpload>;
  readonly altText?: string;
  readonly idempotencyKey?: string;
}

export interface FileUploadMultipartResult extends FileResultBase {
  file: { id: string } | null;
}
