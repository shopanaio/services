import { z } from "zod";
import { DiscountKind, DiscountMethod } from "@/graphql/types";

export const createDiscountSchema = z
  .object({
    kind: z.enum(
      [
        DiscountKind.AmountOffProducts,
        DiscountKind.BuyXGetY,
        DiscountKind.AmountOffOrder,
        DiscountKind.FreeShipping,
      ],
      { error: "Select a discount type" },
    ),
    method: z.enum([DiscountMethod.Automatic, DiscountMethod.Code], {
      error: "Select an activation method",
    }),
    title: z.string().trim().max(255, "Title must be 255 characters or less"),
  })
  .superRefine((values, context) => {
    if (values.method === DiscountMethod.Automatic && !values.title) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["title"],
        message: "Title is required for automatic discounts",
      });
    }
  });

export type CreateDiscountFormValues = z.infer<typeof createDiscountSchema>;
