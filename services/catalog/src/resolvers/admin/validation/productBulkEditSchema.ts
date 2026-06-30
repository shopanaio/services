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
          const hasProductFields = p.operations
            ? p.operations.handle !== undefined ||
              p.operations.title !== undefined ||
              Object.prototype.hasOwnProperty.call(p.operations, "vendorId") ||
              p.operations.content !== undefined ||
              p.operations.seo !== undefined ||
              p.operations.status !== undefined ||
              p.operations.media !== undefined
            : false;
          const productOps = hasProductFields ? 1 : 0;
          const categoryOps = p.operations?.categories?.length ?? 0;
          const tagOps = p.operations?.tags?.length ?? 0;
          const variantOps = p.operations?.variants?.length ?? 0;
          return sum + productOps + categoryOps + tagOps + variantOps;
        }, 0);
        return totalOps <= 500;
      },
      { message: "Total operations exceed limit of 500" }
    );
