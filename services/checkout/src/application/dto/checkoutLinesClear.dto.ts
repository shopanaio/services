import { Expose } from "class-transformer";
import { IsGlobalId } from "@src/application/validation/globalIdValidators";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";

/**
 * DTO for checkoutLinesClear API. Mirrors CheckoutLinesClearInput from GraphQL schema.
 */
export class CheckoutLinesClearDto {
  @Expose()
  @IsGlobalId({ entityType: GlobalIdEntity.Checkout, message: "Invalid checkout ID format" })
  checkoutId!: string;
}
