import type { File } from "../../../repositories/models/index.js";

export interface FileRestoreParams {
  readonly id: string;
}

export interface FileRestoreResult {
  file?: File;
  error?:
    | "FILE_NOT_FOUND"
    | "FILE_BEING_DELETED"
    | "INVALID_STATE"
    | "INTERNAL_ERROR";
}
