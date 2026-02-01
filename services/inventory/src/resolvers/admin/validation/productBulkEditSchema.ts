import { z } from "zod";
import {
  ProductUpdateInputSchema,
  ProductSetStatusInputSchema,
  VariantSetPricingInputSchema,
  VariantSetDimensionsInputSchema,
  VariantSetInventoryInputSchema,
} from "../generated/schemas.js";

export const ProductBulkUpdateInputSchema = () =>
  z
    .object({
      productUpdate: z.array(ProductUpdateInputSchema()).optional(),
      productSetStatus: z.array(ProductSetStatusInputSchema()).optional(),
      variantSetPricing: z.array(VariantSetPricingInputSchema()).optional(),
      variantSetDimensions: z.array(VariantSetDimensionsInputSchema()).optional(),
      variantSetInventory: z.array(VariantSetInventoryInputSchema()).optional(),
    })
    .refine((input) => countTotalOps(input) >= 1, {
      message: "At least one operation required",
      params: { code: "EMPTY_INPUT" },
    })
    .refine((input) => countTotalOps(input) <= 500, {
      message: "Total operations exceed limit of 500",
      params: { code: "BATCH_LIMIT_EXCEEDED" },
    });

function countTotalOps(input: Record<string, unknown[] | undefined>): number {
  return Object.values(input).reduce((sum, arr) => sum + (arr?.length ?? 0), 0);
}
