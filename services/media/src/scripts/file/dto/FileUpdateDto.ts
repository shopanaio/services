import type { FileResultBase } from "./shared.js";
import type {
  MediaProcessingStatus,
  MediaType,
} from "../../../repositories/FileRepository.js";

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
