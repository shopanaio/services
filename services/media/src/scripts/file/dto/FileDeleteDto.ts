import { z } from "zod";
import type { FileResultBase } from "./shared.js";

export const fileDeleteSchema = z.object({
  id: z.string().trim().min(1, "id is required"),
  permanent: z.boolean().optional(),
});

export interface FileDeleteParams {
  readonly id: string;
  readonly permanent?: boolean;
}

export interface FileDeleteResult extends FileResultBase {
  deletedFileId: string | null;
}
