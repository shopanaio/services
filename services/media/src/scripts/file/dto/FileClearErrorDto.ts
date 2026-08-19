import { z } from "zod";
import type { File } from "../../../repositories/models/index.js";

export const fileClearErrorSchema = z.object({
  id: z.string().trim().min(1, "id is required"),
});

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
