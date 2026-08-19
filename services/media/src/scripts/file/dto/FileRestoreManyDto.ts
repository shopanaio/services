import { z } from "zod";

export const fileRestoreManySchema = z.object({
  ids: z.array(z.string().trim().min(1)).min(1, "At least one id is required").max(100),
});

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
