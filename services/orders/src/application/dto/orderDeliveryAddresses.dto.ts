import { Type } from "class-transformer";
import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  ValidateNested,
} from "class-validator";

/**
 * DTO for single delivery address (corresponds to OrderDeliveryAddressInput)
 */
export class OrderDeliveryAddressInputDto {
  @IsString({ message: "Address1 must be a string" })
  @Matches(/\S/, { message: "Address1 cannot be blank" })
  address1!: string;

  @IsOptional()
  @IsString({ message: "Address2 must be a string" })
  address2?: string | null;

  @IsString({ message: "City must be a string" })
  @Matches(/\S/, { message: "City cannot be blank" })
  city!: string;

  @IsString({ message: "Country code must be a string" })
  @Length(2, 2, { message: "Country code must be exactly 2 characters" })
  @Matches(/^[A-Z]{2}$/, {
    message: "Country code must be uppercase ISO 3166-1 alpha-2",
  })
  countryCode!: string;

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
  data?: any; // JSON field
}

/**
 * DTO for adding delivery addresses (corresponds to OrderDeliveryAddressesAddInput)
 */
export class OrderDeliveryAddressesAddDto {
  @IsUUID(7, { message: "Invalid order ID format" })
  orderId!: string;

  @IsArray({ message: "Addresses must be an array" })
  @ValidateNested({ each: true })
  @Type(() => OrderDeliveryAddressInputDto)
  addresses!: OrderDeliveryAddressInputDto[];
}

/**
 * DTO for updating single delivery address (corresponds to OrderDeliveryAddressUpdateInput)
 */
export class OrderDeliveryAddressUpdateDto {
  @IsUUID(7, { message: "Invalid address ID format" })
  addressId!: string;

  @ValidateNested()
  @Type(() => OrderDeliveryAddressInputDto)
  address!: OrderDeliveryAddressInputDto;
}

/**
 * DTO for batch updating delivery addresses (corresponds to OrderDeliveryAddressesUpdateInput)
 */
export class OrderDeliveryAddressesUpdateDto {
  @IsUUID(7, { message: "Invalid order ID format" })
  orderId!: string;

  @IsArray({ message: "Updates must be an array" })
  @ValidateNested({ each: true })
  @Type(() => OrderDeliveryAddressUpdateDto)
  updates!: OrderDeliveryAddressUpdateDto[];
}

/**
 * DTO for removing delivery addresses (corresponds to OrderDeliveryAddressesRemoveInput)
 */
export class OrderDeliveryAddressesRemoveDto {
  @IsUUID(7, { message: "Invalid order ID format" })
  orderId!: string;

  @IsArray({ message: "AddressIds must be an array" })
  @IsUUID(7, { each: true, message: "Each address ID must be a valid UUID" })
  addressIds!: string[];
}
