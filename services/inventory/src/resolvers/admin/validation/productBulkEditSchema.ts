import { z } from "zod";
import {
  ProductUpdateInputSchema,
  ProductUpdateStatusInputSchema,
  VariantUpdatePricingInputSchema,
  VariantUpdateDimensionsInputSchema,
  VariantUpdateInventoryInputSchema,
} from "../generated/schemas.js";

export const ProductBulkUpdateInputSchema = () =>
  z
    .object({
      productUpdate: z.array(ProductUpdateInputSchema()).optional(),
      productUpdateStatus: z.array(ProductUpdateStatusInputSchema()).optional(),
      variantUpdatePricing: z.array(VariantUpdatePricingInputSchema()).optional(),
      variantUpdateDimensions: z.array(VariantUpdateDimensionsInputSchema()).optional(),
      variantUpdateInventory: z.array(VariantUpdateInventoryInputSchema()).optional(),
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
