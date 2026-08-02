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
  IsIn,
  IsObject,
  ValidateIf,
  MaxLength,
} from "class-validator";
import { IsISO4217 } from "@src/application/validation/decorators";
import { IsGlobalId } from "@src/application/validation/globalIdValidators";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import type { CheckoutPipelineJsonObject } from "../pipeline/contracts/index.js";

export class CheckoutLinePurchaseInputDto {
  @Expose()
  @IsIn(["ONE_TIME", "SUBSCRIPTION"])
  type!: "ONE_TIME" | "SUBSCRIPTION";

  @Expose()
  @ValidateIf((value: CheckoutLinePurchaseInputDto) =>
    value.type === "SUBSCRIPTION" || value.sellingPlanId !== undefined,
  )
  @IsGlobalId({
    entityType: GlobalIdEntity.SellingPlan,
    message: "sellingPlanId must be a SellingPlan Global ID",
  })
  sellingPlanId?: string;
}

/**
 * DTO for child line input in bundles.
 */
export class CheckoutChildLineInputDto {
  @Expose()
  @IsGlobalId({
    entityType: GlobalIdEntity.ProductComponentItem,
    message: "componentItemId must be a ProductComponentItem Global ID",
  })
  componentItemId!: string;

  @Expose()
  @IsGlobalId({
    entityType: GlobalIdEntity.Variant,
    message: "purchasableId must be a Variant Global ID",
  })
  purchasableId!: string;

  @Expose()
  @IsInt()
  @Min(1)
  quantity!: number;

  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => CheckoutLinePurchaseInputDto)
  purchase?: CheckoutLinePurchaseInputDto;

  @Expose()
  @IsOptional()
  @IsObject()
  attributes?: CheckoutPipelineJsonObject;
}

/**
 * DTO for checkoutCreate API. Class-validator runs here to guard API inputs.
 * Domain invariants are additionally enforced in the decider/validator.
 */
export class CheckoutLineInputDto {
  @Expose()
  @IsGlobalId({
    entityType: GlobalIdEntity.Variant,
    message: "purchasableId must be a Variant Global ID",
  })
  purchasableId!: string;

  @Expose()
  @IsInt()
  @Min(1)
  quantity!: number;

  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => CheckoutLinePurchaseInputDto)
  purchase?: CheckoutLinePurchaseInputDto;

  @Expose()
  @IsOptional()
  @IsObject()
  attributes?: CheckoutPipelineJsonObject;

  @Expose()
  @IsOptional()
  @Matches(/^[a-zA-Z0-9]+$/, {
    message: "tagSlug must be alphanumeric (a-zA-Z0-9)",
  })
  tagSlug?: string;

  @Expose()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutChildLineInputDto)
  children?: CheckoutChildLineInputDto[];
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
  unique!: boolean;
}

export class CreateCheckoutDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  idempotencyKey!: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  channelCode!: string;

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
