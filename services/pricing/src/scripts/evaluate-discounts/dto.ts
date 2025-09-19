/**
 * DTO classes for discount evaluation parameter validation
 * Use class-validator for declarative validation
 */

import { Type, Transform } from "class-transformer";
import {
  IsArray,
  IsOptional,
  IsString,
  IsNotEmpty,
  IsPositive,
  ValidateNested,
  ArrayNotEmpty,
} from "class-validator";
import { Money } from "@shopana/money";

/**
 * DTO for product unit within cart item
 */
export class LineItemUnitDto {
  /** Product unit identifier */
  @IsString({ message: "Unit ID must be a string" })
  @IsNotEmpty({ message: "Unit ID cannot be empty" })
  readonly id!: string;

  /**
   * Price per unit in minor currency units
   * Converted from string/number to bigint
   */
  @Transform(({ value }) => {
    return Money.fromJSON(value);
  })
  readonly price!: Money;

  /** Strikethrough price (if any) in minor currency units */
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return null;
    return Money.fromJSON(value);
  })
  readonly compareAtPrice?: Money | null;

  /** Product SKU */
  @IsOptional()
  @IsString({ message: "SKU must be a string" })
  readonly sku?: string | null;

  /** Snapshot of additional product data at the time of adding to cart */
  @IsOptional()
  readonly snapshot?: Record<string, unknown> | null;
}

/**
 * DTO for cart item with product information and quantity
 */
export class LineItemDto {
  /** Unique identifier of cart item */
  @IsString({ message: "Line ID must be a string" })
  @IsNotEmpty({ message: "Line ID cannot be empty" })
  readonly lineId!: string;

  /** Product quantity */
  @IsPositive({ message: "Quantity must be positive" })
  readonly quantity!: number;

  /** Product unit information */
  @ValidateNested({ message: "Unit data is invalid" })
  @Type(() => LineItemUnitDto)
  readonly unit!: LineItemUnitDto;
}

/**
 * DTO for cart discount evaluation parameter validation
 * Replaces custom validation with class-validator decorators
 */
export class EvaluateDiscountsParamsDto {
  /** Cart currency */
  @IsString({ message: "Currency must be a string" })
  @IsNotEmpty({ message: "Currency cannot be empty" })
  readonly currency!: string;

  /** Project identifier (from header) */
  @IsString({ message: "Project ID must be a string" })
  @IsNotEmpty({ message: "Project ID cannot be empty" })
  readonly projectId!: string;

  /** Cart items */
  @IsArray({ message: "Lines must be an array" })
  @ArrayNotEmpty({ message: "Lines cannot be empty" })
  @ValidateNested({ each: true, message: "Invalid line item data" })
  @Type(() => LineItemDto)
  readonly lines!: LineItemDto[];

  /** Discount codes applied by user */
  @IsOptional()
  @IsArray({ message: "Applied discount codes must be an array" })
  @IsString({ each: true, message: "Each discount code must be a string" })
  readonly appliedDiscountCodes?: string[];

  /** Cart identifier (for getting discount provider settings) */
  @IsOptional()
  @IsString({ message: "Checkout ID must be a string" })
  readonly checkoutId?: string;

  /** Request identifier for tracing */
  @IsOptional()
  @IsString({ message: "Request ID must be a string" })
  readonly requestId?: string;

  /** Client User-Agent for analytics */
  @IsOptional()
  @IsString({ message: "User agent must be a string" })
  readonly userAgent?: string;
}
