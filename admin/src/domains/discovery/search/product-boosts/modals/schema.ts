import { z } from "zod";

const unicodeLength = (value: string) => Array.from(value).length;
const requiredText = (label: string) =>
  z
    .string()
    .trim()
    .refine((value) => unicodeLength(value) > 0, `${label} is required`)
    .refine((value) => unicodeLength(value) <= 128, `${label} must be at most 128 characters`);

export const productBoostFormSchema = z.object({
  name: requiredText("Name"),
  locale: z.string().min(1, "Locale is required"),
  enabled: z.boolean(),
  phrases: z
    .array(z.object({ value: z.string().trim().min(1, "Phrase is required") }))
    .min(1, "Add at least one trigger phrase")
    .max(20, "A boost can contain at most 20 trigger phrases")
    .superRefine((phrases, context) => {
      const seen = new Map<string, number>();
      phrases.forEach(({ value }, index) => {
        const normalized = value.normalize("NFKC").trim().toLocaleLowerCase();
        const previousIndex = seen.get(normalized);
        if (previousIndex !== undefined) {
          context.addIssue({
            code: "custom",
            path: [index, "value"],
            message: `Duplicates trigger phrase ${previousIndex + 1}`,
          });
        } else if (normalized) {
          seen.set(normalized, index);
        }
      });
    }),
  products: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().optional(),
        image: z.string().nullable().optional(),
        status: z.string().optional(),
        isPublished: z.boolean().optional(),
        media: z.unknown().optional(),
      }),
    )
    .min(1, "Select at least one product")
    .max(50, "A boost can contain at most 50 products")
    .refine(
      (products) => new Set(products.map(({ id }) => id)).size === products.length,
      "Products must be unique",
    ),
});

export type ProductBoostFormValues = z.infer<typeof productBoostFormSchema>;
