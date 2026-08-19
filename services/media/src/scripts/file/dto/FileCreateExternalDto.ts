import { z } from "zod";
import type { FileResultBase } from "./shared.js";

export const fileCreateExternalSchema = z.object({
  provider: z.string().trim().min(1, "provider is required").max(32),
  externalId: z.string().trim().min(1, "externalId is required").max(255),
  url: z.string().trim().min(1, "url is required").max(2048),
  thumbnailUrl: z.string().trim().max(2048).optional(),
  originalName: z.string().trim().max(1024).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  durationMs: z.number().int().positive().optional(),
  altText: z.string().trim().max(1024).optional(),
  providerMeta: z.record(z.string(), z.unknown()).optional(),
  idempotencyKey: z.string().trim().min(1).max(255).optional(),
});

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
  // ownerId is taken from store context (this.storeId)
}

export interface FileCreateExternalResult extends FileResultBase {
  file: { id: string } | null;
}
