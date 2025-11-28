import { Expose, Type } from "class-transformer";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
  Matches,
  IsBoolean,
} from "class-validator";
import { IsISO4217 } from "@src/application/validation/decorators";
import { IsGlobalId } from "@src/application/validation/globalIdValidators";

export class PurchasableSnapshotInputDto {
  /** Title of the purchasable snapshot. */
  @Expose()
  @IsString()
  @IsNotEmpty()
  title!: string;

  /** Image URL of the purchasable snapshot. */
  @Expose()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  /** SKU of the purchasable snapshot. */
  @Expose()
  @IsOptional()
  @IsString()
  sku?: string;

  /** JSON data of the purchasable snapshot. */
  @Expose()
  @IsOptional()
  data?: Record<string, unknown>;
}

/**
 * DTO for checkoutCreate API. Class-validator runs here to guard API inputs.
 * Domain invariants are additionally enforced in the decider/validator.
 */
export class CheckoutLineInputDto {
  @Expose()
  @IsGlobalId({ message: "Invalid purchasable ID format" })
  purchasableId!: string;

  @Expose()
  @IsInt()
  @Min(1)
  quantity!: number;

  @Expose()
  @IsOptional()
  @ValidateNested()
  // AI: Share a snapshot with inventory.
  @Type(() => PurchasableSnapshotInputDto)
  purchasableSnapshot?: PurchasableSnapshotInputDto;

  @Expose()
  @IsOptional()
  @Matches(/^[a-zA-Z0-9]+$/, {
    message: "tagSlug must be alphanumeric (a-zA-Z0-9)",
  })
  tagSlug?: string;
}

export class CheckoutTagDto {
  @Expose()
  @IsString()
  @Matches(/^[a-zA-Z0-9]+$/, {
    message: "slug must be alphanumeric (a-zA-Z0-9)",
  })
  slug!: string;

  @Expose()
  @IsBoolean()
  isUnique!: boolean;
}

export class CreateCheckoutDto {
  // Matches CheckoutCreateInput from GraphQL schema
  // idempotency removed: idempotency will be computed by server from request

  @Expose()
  @IsOptional()
  @IsString()
  externalSource?: string;

  @Expose()
  @IsOptional()
  @IsString()
  externalId?: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  // ISO 639-1 code (2 letters) – keep as generic string validation here
  localeCode!: string;

  @Expose()
  @IsString()
  @IsISO4217({ message: "currencyCode must be ISO-4217 (3 uppercase letters)" })
  currencyCode!: string;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutLineInputDto)
  items!: CheckoutLineInputDto[];

  @Expose()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutTagDto)
  tags?: CheckoutTagDto[];
}
