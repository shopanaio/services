import type { FileResultBase } from "./shared.js";

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
}

export interface FileCreateExternalResult extends FileResultBase {
  file: { id: string } | null;
}
