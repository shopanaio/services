/**
 * DTO classes for discount evaluation parameter validation
 * Validation is performed using zod schemas in validation.ts
 */
import { Money } from "@shopana/shared-money";

/**
 * DTO for product unit within cart item
 */
export class LineItemUnitDto {
  /** Product unit identifier */
  readonly id!: string;

  /**
   * Price per unit in minor currency units
   * Transformed from MoneySnapshot to Money instance by zod schema
   */
  readonly price!: Money;

  /** Strikethrough price (if any) in minor currency units */
  readonly compareAtPrice?: Money | null;

  /** Product SKU */
  readonly sku?: string | null;

  /** Snapshot of additional product data at the time of adding to cart */
  readonly snapshot?: Record<string, unknown> | null;
}

/**
 * DTO for cart item with product information and quantity
 */
export class LineItemDto {
  /** Unique identifier of cart item */
  readonly lineId!: string;

  /** Product quantity */
  readonly quantity!: number;

  /** Product unit information */
  readonly unit!: LineItemUnitDto;
}

/**
 * DTO for cart discount evaluation parameter validation
 * Validation is performed using zod schemas in validation.ts
 */
export class EvaluateDiscountsParamsDto {
  /** Cart currency */
  readonly currency!: string;

  /** Project identifier (from header) */
  readonly projectId!: string;

  /** Cart items */
  readonly lines!: LineItemDto[];

  /** Discount codes applied by user */
  readonly appliedDiscountCodes?: string[];

  /** Cart identifier (for getting discount provider settings) */
  readonly checkoutId?: string;

  /** Request identifier for tracing */
  readonly requestId?: string;

  /** Client User-Agent for analytics */
  readonly userAgent?: string;
}
