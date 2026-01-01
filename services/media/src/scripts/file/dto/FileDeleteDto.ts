import type { FileResultBase } from "./shared.js";

export interface FileDeleteParams {
  readonly id: string;
  readonly permanent?: boolean;
}

export interface FileDeleteResult extends FileResultBase {
  deletedFileId: string | null;
}
