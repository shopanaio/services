import { z } from "zod";

export const fileDeleteManySchema = z.object({
  ids: z.array(z.string().trim().min(1)).min(1, "At least one id is required").max(100),
  permanent: z.boolean().optional(),
});

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
