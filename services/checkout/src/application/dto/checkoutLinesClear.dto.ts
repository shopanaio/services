import { Expose } from "class-transformer";
import { IsNotEmpty, IsString } from "class-validator";

/**
 * DTO for checkoutLinesClear API. Mirrors CheckoutLinesClearInput from GraphQL schema.
 */
export class CheckoutLinesClearDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  checkoutId!: string;
}
