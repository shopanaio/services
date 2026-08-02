import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsObject,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from "class-validator";
import {
  IsGlobalId,
  IsGlobalIdArray,
} from "@src/application/validation/globalIdValidators";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import type { CheckoutPipelineJsonObject } from "../pipeline/contracts/index.js";

/**
 * DTO for single delivery address (corresponds to CheckoutDeliveryAddressInput)
 */
export class CheckoutDeliveryAddressInputDto {
  @IsOptional()
  @IsString({ message: "Address1 must be a string" })
  @Matches(/\S/, { message: "Address1 cannot be blank" })
  address1?: string | null;

  @IsOptional()
  @IsString({ message: "Address2 must be a string" })
  address2?: string | null;

  @IsOptional()
  @IsString({ message: "City must be a string" })
  @Matches(/\S/, { message: "City cannot be blank" })
  city?: string | null;

  @IsOptional()
  @IsString({ message: "Country code must be a string" })
  @Length(2, 2, { message: "Country code must be exactly 2 characters" })
  @Matches(/^[A-Z]{2}$/, {
    message: "Country code must be uppercase ISO 3166-1 alpha-2",
  })
  countryCode?: string | null;

  @IsOptional()
  @IsString({ message: "Province code must be a string" })
  provinceCode?: string | null;

  @IsOptional()
  @IsString({ message: "Postal code must be a string" })
  postalCode?: string | null;

  @IsOptional()
  @IsEmail({}, { message: "Invalid email format" })
  email?: string | null;

  @IsOptional()
  @IsString({ message: "First name must be a string" })
  firstName?: string | null;

  @IsOptional()
  @IsString({ message: "Last name must be a string" })
  lastName?: string | null;

  @IsOptional()
  @IsString({ message: "Phone must be a string" })
  phone?: string | null;

  @IsOptional()
  @IsObject()
  data?: CheckoutPipelineJsonObject | null;
}

export class CheckoutDeliveryDestinationInputDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsGlobalIdArray({
    entityType: GlobalIdEntity.CheckoutLine,
    message: "Each checkout line ID must be a CheckoutLine Global ID",
  })
  checkoutLineIds!: string[];

  @ValidateNested()
  @Type(() => CheckoutDeliveryAddressInputDto)
  address!: CheckoutDeliveryAddressInputDto;
}

/**
 * DTO for adding delivery addresses (corresponds to CheckoutDeliveryAddressesAddInput)
 */
export class CheckoutDeliveryAddressesAddDto {
  @IsGlobalId({
    entityType: GlobalIdEntity.Checkout,
    message: "Invalid checkout ID format",
  })
  checkoutId!: string;

  @IsArray({ message: "Addresses must be an array" })
  @ValidateNested({ each: true })
  @Type(() => CheckoutDeliveryDestinationInputDto)
  addresses!: CheckoutDeliveryDestinationInputDto[];
}

/**
 * DTO for updating single delivery address (corresponds to CheckoutDeliveryAddressUpdateInput)
 */
export class CheckoutDeliveryAddressUpdateDto {
  @IsGlobalId({
    entityType: GlobalIdEntity.CheckoutDeliveryAddress,
    message: "Invalid address ID format",
  })
  addressId!: string;

  @ValidateNested()
  @Type(() => CheckoutDeliveryAddressInputDto)
  address!: CheckoutDeliveryAddressInputDto;
}

/**
 * DTO for batch updating delivery addresses (corresponds to CheckoutDeliveryAddressesUpdateInput)
 */
export class CheckoutDeliveryAddressesUpdateDto {
  @IsGlobalId({
    entityType: GlobalIdEntity.Checkout,
    message: "Invalid checkout ID format",
  })
  checkoutId!: string;

  @IsArray({ message: "Updates must be an array" })
  @ValidateNested({ each: true })
  @Type(() => CheckoutDeliveryAddressUpdateDto)
  updates!: CheckoutDeliveryAddressUpdateDto[];
}

/**
 * DTO for removing delivery addresses (corresponds to CheckoutDeliveryAddressesRemoveInput)
 */
export class CheckoutDeliveryAddressesRemoveDto {
  @IsGlobalId({
    entityType: GlobalIdEntity.Checkout,
    message: "Invalid checkout ID format",
  })
  checkoutId!: string;

  @IsArray({ message: "AddressIds must be an array" })
  @IsGlobalIdArray({
    entityType: GlobalIdEntity.CheckoutDeliveryAddress,
    message: "Each address ID must be a valid Global ID",
  })
  addressIds!: string[];
}
