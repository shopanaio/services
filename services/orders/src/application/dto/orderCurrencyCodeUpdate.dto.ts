import { IsUUID, IsString, IsOptional, MinLength, Matches } from "class-validator";

export class OrderCurrencyCodeUpdateInput {
  @IsUUID(7, { message: "Invalid order ID format" })
  orderId!: string;

  @IsString({ message: "Currency code must be a string" })
  @Matches(/^[A-Z]{3}$/, { message: "Invalid currency code format (expected: USD, EUR, etc.)" })
  currencyCode!: string;

  @IsOptional()
  @IsString({ message: "Idempotency key must be a string" })
  @MinLength(1, { message: "Idempotency key cannot be empty" })
  idempotencyKey?: string;
}
