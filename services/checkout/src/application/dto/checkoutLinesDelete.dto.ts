import { Expose } from "class-transformer";
import { ArrayMinSize, IsArray } from "class-validator";
import {
  IsGlobalId,
  IsGlobalIdArray,
} from "@src/application/validation/globalIdValidators";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";

/**
 * DTO for checkoutLinesDelete API. Mirrors CheckoutLinesDeleteInput from GraphQL schema.
 */
export class CheckoutLinesDeleteDto {
  @Expose()
  @IsGlobalId({ entityType: GlobalIdEntity.Checkout, message: "Invalid checkout ID format" })
  checkoutId!: string;

  @Expose()
  @IsArray()
  @ArrayMinSize(1)
  @IsGlobalIdArray({ entityType: GlobalIdEntity.CheckoutLine })
  lineIds!: string[];
}
