import { Expose } from "class-transformer";
import { ArrayMinSize, IsArray } from "class-validator";
import {
  IsGlobalId,
  IsGlobalIdArray,
} from "@src/application/validation/globalIdValidators";

/**
 * DTO for checkoutLinesDelete API. Mirrors CheckoutLinesDeleteInput from GraphQL schema.
 */
export class CheckoutLinesDeleteDto {
  @Expose()
  @IsGlobalId({ message: "Invalid checkout ID format" })
  checkoutId!: string;

  @Expose()
  @IsArray()
  @ArrayMinSize(1)
  @IsGlobalIdArray()
  lineIds!: string[];
}
