import { z } from "zod";
import { ProductUpdateInputSchema } from "../generated/schemas.js";

export const ProductBulkUpdateInputSchema = () =>
  z
    .object({
      products: z
        .array(
          z.object({
            productId: z.string(),
            expectedRevision: z.number().int().optional(),
            operations: ProductUpdateInputSchema().optional(),
          })
        )
        .min(1, "At least one product required")
        .max(100, "Maximum 100 products per request"),
    })
    .refine(
      (input) => {
        const totalOps = input.products.reduce((sum, p) => {
          const productOps = p.operations ? 1 : 0;
          const variantOps = p.operations?.variants?.length ?? 0;
          return sum + productOps + variantOps;
        }, 0);
        return totalOps <= 500;
      },
      { message: "Total operations exceed limit of 500" }
    );
