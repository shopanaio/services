import { Expose, Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { IsGlobalId } from "@shopana/shared-graphql-guid";

/**
 * Snapshot of purchasable data used when adding lines to an order.
 */
export class PurchasableSnapshotInputDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @Expose()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @Expose()
  @IsOptional()
  @IsString()
  sku?: string;

  @Expose()
  @IsOptional()
  data?: Record<string, unknown>;
}

/**
 * DTO for order line payloads reused across mutations.
 */
export class OrderLineInputDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  purchasableId!: string;

  @Expose()
  @IsInt()
  @Min(1)
  quantity!: number;

  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => PurchasableSnapshotInputDto)
  purchasableSnapshot?: PurchasableSnapshotInputDto;
}

/**
 * DTO for storefront mutation orderCreate.
 * Validates single required argument checkoutId.
 */
export class CreateOrderDto {
  @Expose()
  @IsGlobalId({ message: "Invalid checkout ID format" })
  checkoutId!: string;
}
