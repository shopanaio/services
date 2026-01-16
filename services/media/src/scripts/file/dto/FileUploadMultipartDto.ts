import type { FileUpload } from "graphql-upload-minimal";
import type { FileResultBase } from "./shared.js";
import type { AssetOwnerType } from "../../../repositories/models/index.js";

export interface FileUploadMultipartParams {
  file: Promise<FileUpload>;
  altText?: string;
  idempotencyKey?: string;
  /** Group ID for asset group lookup */
  groupId: string;
}

export interface FileUploadMultipartResult extends FileResultBase {
  file: { id: string } | null;
}
