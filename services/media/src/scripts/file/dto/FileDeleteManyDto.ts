export interface FileDeleteManyParams {
  readonly ids: string[];
  readonly permanent?: boolean;
}

export interface FileDeleteManyResult {
  acceptedIds: string[];
  startedHardDeleteIds: string[];
  errors: Array<{
    id: string;
    code: "FILE_NOT_FOUND" | "FILE_BEING_DELETED" | "INTERNAL_ERROR";
  }>;
}
