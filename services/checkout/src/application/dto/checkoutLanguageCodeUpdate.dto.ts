import { IsUUID, IsString, IsOptional, MinLength, Matches } from "class-validator";

export class CheckoutLanguageCodeUpdateInput {
  @IsUUID(7, { message: "Invalid checkout ID format" })
  checkoutId!: string;

  @IsString({ message: "Locale code must be a string" })
  @Matches(/^[a-z]{2}(-[A-Z]{2})?$/, { message: "Invalid locale code format (expected: en, en-US, etc.)" })
  localeCode!: string;

  @IsOptional()
  @IsString({ message: "Idempotency key must be a string" })
  @MinLength(1, { message: "Idempotency key cannot be empty" })
  idempotencyKey?: string;
}
