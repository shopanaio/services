import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  Matches,
} from "class-validator";
import { IsGlobalId } from "@src/application/validation/globalIdValidators";

export class CheckoutCustomerIdentityUpdateInput {
  @IsGlobalId({ message: "Invalid checkout ID format" })
  checkoutId!: string;

  @IsOptional()
  @IsEmail({}, { message: "Invalid email format" })
  email?: string | null;

  @IsOptional()
  @IsGlobalId({ message: "Invalid customer ID format" })
  customerId?: string | null;

  @IsOptional()
  @IsString({ message: "Phone number must be a string" })
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: "Invalid phone number format" })
  phone?: string | null;

  @IsOptional()
  @IsString({ message: "Country code must be a string" })
  @Matches(/^[A-Z]{2}$/, {
    message: "Country code must be a valid 2-letter ISO code",
  })
  countryCode?: string | null;

  @IsOptional()
  @IsString({ message: "Idempotency key must be a string" })
  @MinLength(1, { message: "Idempotency key cannot be empty" })
  idempotencyKey?: string;

  @IsOptional()
  @IsString({ message: "First name must be a string" })
  firstName?: string | null;

  @IsOptional()
  @IsString({ message: "Last name must be a string" })
  lastName?: string | null;

  @IsOptional()
  @IsString({ message: "Middle name must be a string" })
  middleName?: string | null;
}
