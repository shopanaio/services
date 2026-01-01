import type { FileResultBase } from "./shared.js";

export interface FileUpdateParams {
  readonly id: string;
  readonly altText?: string;
  readonly originalName?: string;
  readonly meta?: Record<string, unknown>;
}

export interface FileUpdateResult extends FileResultBase {
  file: { id: string } | null;
}
