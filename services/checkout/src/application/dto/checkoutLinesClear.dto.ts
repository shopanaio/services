import { Expose } from "class-transformer";
import { IsGlobalId } from "@src/application/validation/globalIdValidators";

/**
 * DTO for checkoutLinesClear API. Mirrors CheckoutLinesClearInput from GraphQL schema.
 */
export class CheckoutLinesClearDto {
  @Expose()
  @IsGlobalId({ message: "Invalid checkout ID format" })
  checkoutId!: string;
}
