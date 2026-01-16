import type { FileResultBase } from "./shared.js";

export interface FileUploadFromUrlParams {
  readonly sourceUrl: string;
  readonly altText?: string;
  readonly idempotencyKey?: string;
  // ownerId is taken from store context (this.storeId)
}

export interface FileUploadFromUrlResult extends FileResultBase {
  file: { id: string } | null;
}
