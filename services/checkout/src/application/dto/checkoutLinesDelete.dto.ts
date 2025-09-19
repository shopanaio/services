import { Expose } from "class-transformer";
import { ArrayMinSize, IsArray, IsNotEmpty, IsString } from "class-validator";

/**
 * DTO for checkoutLinesDelete API. Mirrors CheckoutLinesDeleteInput from GraphQL schema.
 */
export class CheckoutLinesDeleteDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  checkoutId!: string;

  @Expose()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  lineIds!: string[];
}
