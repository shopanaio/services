import { Expose } from "class-transformer";
import { IsString, IsNotEmpty, MaxLength } from "class-validator";
import { IsGlobalId } from "@src/application/validation/globalIdValidators";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";

/**
 * DTO for checkoutPromoCodeAdd API.
 */
export class CheckoutPromoCodeAddDto {
  @Expose()
  @IsGlobalId({ entityType: GlobalIdEntity.Checkout, message: "Invalid checkout ID format" })
  checkoutId!: string;

  @Expose()
  @IsString({ message: "Promo code must be a string" })
  @IsNotEmpty({ message: "Promo code cannot be empty" })
  @MaxLength(50, { message: "Promo code too long" })
  code!: string;
}

/**
 * DTO for checkoutPromoCodeRemove API.
 */
export class CheckoutPromoCodeRemoveDto {
  @Expose()
  @IsGlobalId({ entityType: GlobalIdEntity.Checkout, message: "Invalid checkout ID format" })
  checkoutId!: string;

  @Expose()
  @IsString({ message: "Promo code must be a string" })
  @IsNotEmpty({ message: "Promo code cannot be empty" })
  @MaxLength(50, { message: "Promo code too long" })
  code!: string;
}
