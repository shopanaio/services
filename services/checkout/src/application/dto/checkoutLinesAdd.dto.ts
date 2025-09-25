import { Expose, Type } from "class-transformer";
import { IsArray, ValidateNested, ArrayMinSize } from "class-validator";
import { CheckoutLineInputDto } from "@src/application/dto/createCheckout.dto";
import { IsGlobalId } from "@src/application/validation/globalIdValidators";

/**
 * DTO for checkoutLinesAdd API. Mirrors CheckoutLinesAddInput from GraphQL schema.
 */
export class CheckoutLinesAddDto {
  @Expose()
  @IsGlobalId({ message: "Invalid checkout ID format" })
  checkoutId!: string;

  @Expose()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutLineInputDto)
  lines!: CheckoutLineInputDto[];
}
