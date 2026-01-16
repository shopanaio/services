import type { FileResultBase } from "./shared.js";
import type { AssetOwnerType } from "../../../repositories/models/index.js";

export interface FileCreateExternalParams {
  readonly provider: string;
  readonly externalId: string;
  readonly url: string;
  readonly thumbnailUrl?: string;
  readonly originalName?: string;
  readonly width?: number;
  readonly height?: number;
  readonly durationMs?: number;
  readonly altText?: string;
  readonly providerMeta?: Record<string, unknown>;
  readonly idempotencyKey?: string;
  /** Owner type for asset group lookup */
  readonly ownerType?: AssetOwnerType;
  /** Owner ID for asset group lookup */
  readonly ownerId?: string;
}

export interface FileCreateExternalResult extends FileResultBase {
  file: { id: string } | null;
}
