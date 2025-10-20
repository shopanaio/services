/**
 * Validation utilities and type guards for discount evaluation system
 */

import { z } from "zod";
import { DiscountType, type Discount } from "@shopana/plugin-sdk/pricing";
import { Money } from "@shopana/shared-money";
import { EvaluateDiscountsParamsDto, LineItemDto, LineItemUnitDto } from "./dto.js";

/**
 * Type guard for checking discount type validity
 * @param type - Value to check
 * @returns true if type is valid DiscountType
 * @example
 * ```typescript
 * if (isValidDiscountType(discount.type)) {
 *   // TypeScript knows that discount.type is DiscountType
 * }
 * ```
 */
export const isValidDiscountType = (type: unknown): type is DiscountType =>
  type === DiscountType.PERCENTAGE || type === DiscountType.FIXED;

/**
 * Type guard for checking discount object validity
 * @param discount - Object to check
 * @returns true if discount matches Discount interface
 */
export const isValidDiscount = (discount: unknown): discount is Discount =>
  typeof discount === "object" &&
  discount !== null &&
  "code" in discount &&
  "type" in discount &&
  "value" in discount &&
  "provider" in discount;

/**
 * Zod schema for Money transformation
 * Accepts MoneySnapshot format and transforms to Money instance
 */
const MoneySchema = z.object({
  amount: z.string(),
  scale: z.string(),
  currency: z.object({
    code: z.string(),
    base: z.union([z.string(), z.array(z.string())]),
    exponent: z.string(),
  }),
}).transform((value) => Money.fromJSON(value));

/**
 * Zod schema for LineItemUnit validation and transformation
 */
const LineItemUnitSchema = z.object({
  id: z.string().min(1, "Unit ID cannot be empty"),
  price: MoneySchema,
  compareAtPrice: MoneySchema.nullable().optional(),
  sku: z.string().nullable().optional(),
  snapshot: z.record(z.unknown()).nullable().optional(),
});

/**
 * Zod schema for LineItem validation
 */
const LineItemSchema = z.object({
  lineId: z.string().min(1, "Line ID cannot be empty"),
  quantity: z.number().positive("Quantity must be positive"),
  unit: LineItemUnitSchema,
});

/**
 * Zod schema for EvaluateDiscountsParams validation
 */
const EvaluateDiscountsParamsSchema = z.object({
  currency: z.string().min(1, "Currency cannot be empty"),
  projectId: z.string().min(1, "Project ID cannot be empty"),
  lines: z.array(LineItemSchema).min(1, "Lines cannot be empty"),
  appliedDiscountCodes: z.array(z.string()).optional(),
  checkoutId: z.string().optional(),
  requestId: z.string().optional(),
  userAgent: z.string().optional(),
});

/**
 * Formats zod validation errors into human-readable format
 * @param error - Zod validation error
 * @returns Formatted error message
 */
export function formatZodError(error: z.ZodError): string {
  const messages = error.errors.map((err) => {
    const path = err.path.join(".");
    return `${path}: ${err.message}`;
  });
  return messages.join("; ");
}

/**
 * Validates input parameters for discount evaluation using zod
 * @param params - Parameters for validation (plain object)
 * @returns Validated and typed object
 * @throws {Error} On incorrect parameters with detailed messages
 */
export const validateParams = (params: unknown): EvaluateDiscountsParamsDto => {
  try {
    const validated = EvaluateDiscountsParamsSchema.parse(params);
    // Convert validated data to DTO class instance for type compatibility
    return {
      currency: validated.currency,
      projectId: validated.projectId,
      lines: validated.lines.map((line) => ({
        lineId: line.lineId,
        quantity: line.quantity,
        unit: {
          id: line.unit.id,
          price: line.unit.price,
          compareAtPrice: line.unit.compareAtPrice,
          sku: line.unit.sku,
          snapshot: line.unit.snapshot,
        } as LineItemUnitDto,
      } as LineItemDto)),
      appliedDiscountCodes: validated.appliedDiscountCodes,
      checkoutId: validated.checkoutId,
      requestId: validated.requestId,
      userAgent: validated.userAgent,
    } as EvaluateDiscountsParamsDto;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${formatZodError(error)}`);
    }
    throw error;
  }
};
