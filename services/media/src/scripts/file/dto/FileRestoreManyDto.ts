export interface FileRestoreManyParams {
  readonly ids: string[];
}

export interface FileRestoreManyResult {
  restoredIds: string[];
  errors: Array<{
    id: string;
    code: "FILE_NOT_FOUND" | "FILE_BEING_DELETED" | "INVALID_STATE" | "INTERNAL_ERROR";
  }>;
}
