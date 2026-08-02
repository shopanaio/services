import { z } from "zod";
import type { Catalog } from "@shopana/broker-types";

const identifier = z.string().trim().min(1).max(512);
export const resolveCheckoutDeliveryFactsParamsSchema: z.ZodType<Catalog.ResolveCheckoutDeliveryFactsParams> = z.object({
  storeId: identifier,
  effectiveAt: z.string().datetime({ offset: true }),
  lines: z.array(z.object({
    lineId: identifier,
    variantId: identifier,
    quantity: z.number().int().safe().positive(),
  }).strict()).max(250),
}).strict().superRefine((value, context) => {
  const lineIds = value.lines.map((line) => line.lineId);
  if (new Set(lineIds).size !== lineIds.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ["lines"], message: "Delivery fact line IDs must be unique" });
});
