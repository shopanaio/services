import { Type } from "class-transformer";
import {
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { IsGlobalId } from "../validation/globalIdValidators.js";
import type { CheckoutPipelineJsonObject } from "../pipeline/contracts/index.js";

export class CheckoutBillingAddressInputDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  firstName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  lastName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  company?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  address1?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  address2?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  city?: string | null;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Za-z]{2}$/)
  countryCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  provinceCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  zip?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  phone?: string | null;

  @IsOptional()
  @IsObject()
  data?: CheckoutPipelineJsonObject | null;
}

export class CheckoutBillingAddressUpdateDto {
  @IsGlobalId({
    entityType: GlobalIdEntity.Checkout,
    message: "Invalid checkout ID format",
  })
  checkoutId!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CheckoutBillingAddressInputDto)
  billingAddress?: CheckoutBillingAddressInputDto | null;
}
