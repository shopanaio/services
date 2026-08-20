import { z } from "zod";
import type { FileResultBase } from "./shared.js";
import type { MediaProcessingStatus, MediaType } from "../../../repositories/FileRepository.js";

export const fileUpdateSchema = z.object({
  id: z.string().trim().min(1, "id is required"),
  altText: z.string().trim().max(1024).nullable().optional(),
  originalName: z.string().trim().max(1024).nullable().optional(),
  meta: z.record(z.string(), z.unknown()).nullable().optional(),
  mediaType: z.enum(["IMAGE", "VIDEO", "EXTERNAL_VIDEO", "MODEL_3D", "GENERIC_FILE"]).optional(),
  previewFileId: z.string().trim().min(1).nullable().optional(),
  thumbhash: z.string().trim().max(1024).nullable().optional(),
  processingStatus: z.enum(["PENDING", "PROCESSING", "READY", "FAILED"]).optional(),
  processingError: z.string().trim().max(4096).nullable().optional(),
});

export interface FileUpdateParams {
  readonly id: string;
  readonly altText?: string | null;
  readonly originalName?: string | null;
  readonly meta?: Record<string, unknown> | null;
  readonly mediaType?: MediaType;
  readonly previewFileId?: string | null;
  readonly thumbhash?: string | null;
  readonly processingStatus?: MediaProcessingStatus;
  readonly processingError?: string | null;
}

export interface FileUpdateResult extends FileResultBase {
  file: { id: string } | null;
}
