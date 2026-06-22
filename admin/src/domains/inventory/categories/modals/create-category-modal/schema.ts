import { z } from "zod";
import type { OutputData } from "@editorjs/editorjs";

const apiFileSchema = z.custom<import("@/graphql/types").ApiFile>(
  (val) =>
    val != null && typeof val === "object" && "id" in val && "url" in val,
);

const editorDataSchema = z
  .custom<OutputData>(
    (val) =>
      val === null ||
      (val != null && typeof val === "object" && "blocks" in val),
  )
  .nullable();

const handleSchema = z
  .string()
  .min(1, "Handle is required")
  .max(255, "Handle must be 255 characters or less")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Handle must contain only lowercase letters, numbers, and hyphens",
  );

export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be 255 characters or less"),
  handle: handleSchema,
  description: editorDataSchema,
  media: z.array(apiFileSchema),
});

export type CreateCategoryFormValues = z.infer<typeof createCategorySchema>;
