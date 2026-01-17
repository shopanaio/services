import type {
  DeletionErrorCode,
  DeletionState,
} from "../repositories/models/files.js";

export type { DeletionErrorCode, DeletionState };

export interface MarkDeletingResult {
  startedAt: Date;
}

export interface FindSoftDeletedForGCParams {
  cutoffDate: Date;
  errorCooldown: Date;
  limit: number;
}

export interface ResetStuckDeletingParams {
  stuckSince: Date;
  limit: number;
}

export interface RestoreResult {
  success: boolean;
  error?: "FILE_BEING_DELETED" | "INVALID_STATE";
}
