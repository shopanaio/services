import type { FileResultBase } from "./shared.js";
import type { AssetOwnerType } from "../../../repositories/models/index.js";

export interface FileUploadFromUrlParams {
  readonly sourceUrl: string;
  readonly altText?: string;
  readonly idempotencyKey?: string;
  /** Owner type for asset group lookup */
  readonly ownerType?: AssetOwnerType;
  /** Owner ID for asset group lookup */
  readonly ownerId?: string;
}

export interface FileUploadFromUrlResult extends FileResultBase {
  file: { id: string } | null;
}
