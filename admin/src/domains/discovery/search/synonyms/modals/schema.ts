import { z } from "zod";

const unicodeLength = (value: string) => Array.from(value).length;

export const synonymGroupFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .refine((value) => unicodeLength(value) <= 128, "Name must be at most 128 characters"),
  locale: z.string().min(1, "Locale is required"),
  enabled: z.boolean(),
  values: z
    .array(
      z.object({
        rowId: z.string().min(1),
        value: z.string().trim().min(1, "Synonym is required"),
      }),
    )
    .min(2, "Add at least two synonyms")
    .max(20, "A group can contain at most 20 synonyms")
    .superRefine((values, context) => {
      const seen = new Map<string, number>();
      values.forEach(({ value }, index) => {
        const normalized = value.normalize("NFKC").trim().toLocaleLowerCase();
        const previousIndex = seen.get(normalized);
        if (previousIndex !== undefined) {
          context.addIssue({
            code: "custom",
            path: [index, "value"],
            message: `Duplicates synonym ${previousIndex + 1}`,
          });
        } else if (normalized) {
          seen.set(normalized, index);
        }
      });
    }),
});

export type SynonymGroupFormValues = z.infer<typeof synonymGroupFormSchema>;
export type SynonymEditorRow = SynonymGroupFormValues["values"][number];
