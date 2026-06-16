import type { File } from "../../../repositories/models/index.js";

export interface FileClearErrorParams {
  readonly id: string;
}

export interface FileClearErrorResult {
  file?: File;
  error?:
    | "FILE_NOT_FOUND"
    | "FILE_BEING_DELETED"
    | "INVALID_STATE"
    | "INTERNAL_ERROR";
}
