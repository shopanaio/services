import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals";
import type { UploadedMedia } from "./components";

// ============================================================================
// Modal Types
// ============================================================================

export const MEDIA_UPLOAD_MODAL_TYPE = "media-upload";

// ============================================================================
// Payload Interfaces
// ============================================================================

export interface IUploadMediaModalPayload extends IModalStackPayload {
  /**
   * Accepted file types (e.g., "image/*,video/*")
   */
  accept?: string;
  /**
   * Maximum file size in MB
   */
  maxSize?: number;
  /**
   * Maximum number of files
   */
  maxFiles?: number;
  /**
   * Callback when media is uploaded
   */
  onUpload?: (media: UploadedMedia[]) => void | Promise<void>;
}

// ============================================================================
// Module Augmentation for Type Safety
// ============================================================================

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [MEDIA_UPLOAD_MODAL_TYPE]: IUploadMediaModalPayload;
  }
}

// ============================================================================
// Typed Hooks
// ============================================================================

/**
 * Hook to open media upload modal
 *
 * @example
 * ```tsx
 * const { push } = useUploadMediaModal();
 * push({
 *   accept: 'image/*',
 *   maxSize: 10,
 *   onUpload: (media) => console.log('Uploaded:', media)
 * });
 * ```
 */
export const useUploadMediaModal = createModalStackHook(MEDIA_UPLOAD_MODAL_TYPE);
