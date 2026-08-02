import { IsString, IsOptional, MinLength, Matches } from "class-validator";
import { IsGlobalId } from "@src/application/validation/globalIdValidators";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";

export class CheckoutCurrencyCodeUpdateInput {
  @IsGlobalId({ entityType: GlobalIdEntity.Checkout, message: "Invalid checkout ID format" })
  checkoutId!: string;

  @IsString({ message: "Currency code must be a string" })
  @Matches(/^[A-Z]{3}$/, {
    message: "Invalid currency code format (expected: USD, EUR, etc.)",
  })
  currencyCode!: string;

  @IsOptional()
  @IsString({ message: "Idempotency key must be a string" })
  @MinLength(1, { message: "Idempotency key cannot be empty" })
  idempotencyKey?: string;
}
