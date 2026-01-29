import { z } from "zod";
import {
  ProductUpdateInputSchema,
  VariantSetSkuInputSchema,
  VariantSetPricingInputSchema,
  VariantSetCostInputSchema,
  VariantSetStockInputSchema,
  VariantSetDimensionsInputSchema,
  VariantSetWeightInputSchema,
} from "../generated/schemas.js";

const productStatusUpdateSchema = z.object({
  productId: z.string().min(1),
  action: z.enum(["PUBLISH", "UNPUBLISH"]),
});

export const ProductBulkUpdateInputSchema = () =>
  z
    .object({
      productUpdate: z.array(ProductUpdateInputSchema()).optional(),
      productStatusUpdate: z.array(productStatusUpdateSchema).optional(),
      variantSetSku: z.array(VariantSetSkuInputSchema()).optional(),
      variantSetPricing: z.array(VariantSetPricingInputSchema()).optional(),
      variantSetCost: z.array(VariantSetCostInputSchema()).optional(),
      variantSetStock: z.array(VariantSetStockInputSchema()).optional(),
      variantSetDimensions: z.array(VariantSetDimensionsInputSchema()).optional(),
      variantSetWeight: z.array(VariantSetWeightInputSchema()).optional(),
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
