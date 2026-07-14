import { z } from "zod";
import { SearchField, SearchOutOfStockPolicy } from "@/graphql/types";

export const searchSettingsFormSchema = z
  .object({
    fields: z.array(
      z.object({
        field: z.nativeEnum(SearchField),
        enabled: z.boolean(),
        weight: z.number().finite(),
      }),
    ),
    typoToleranceEnabled: z.boolean(),
    outOfStockPolicy: z.nativeEnum(SearchOutOfStockPolicy),
  })
  .superRefine((values, context) => {
    const seen = new Set<SearchField>();

    values.fields.forEach((item, index) => {
      if (seen.has(item.field)) {
        context.addIssue({
          code: "custom",
          path: ["fields", index, "field"],
          message: "Search fields must be unique.",
        });
      }
      seen.add(item.field);

      if (item.enabled && (item.weight <= 0 || item.weight > 100)) {
        context.addIssue({
          code: "custom",
          path: ["fields", index, "weight"],
          message: "Weight must be greater than 0 and at most 100.",
        });
      }
    });

    if (!values.fields.some((item) => item.enabled)) {
      context.addIssue({
        code: "custom",
        path: ["fields"],
        message: "At least one search field must be enabled.",
      });
    }
  });
