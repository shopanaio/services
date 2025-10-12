import { Expose, Type } from "class-transformer";
import { IsGlobalId } from "@src/application/validation/globalIdValidators";
import { IsArray, ValidateNested, IsInt, Min, IsOptional } from "class-validator";

export class CheckoutLineReplaceItemDto {
  @Expose()
  @IsGlobalId({ message: "Invalid source line ID format" })
  lineIdFrom!: string;

  @Expose()
  @IsGlobalId({ message: "Invalid target line ID format" })
  lineIdTo!: string;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

/**
 * DTO for checkoutLinesReplace API. Mirrors CheckoutLinesReplaceInput from GraphQL schema.
 */
export class CheckoutLinesReplaceDto {
  @Expose()
  @IsGlobalId({ message: "Invalid checkout ID format" })
  checkoutId!: string;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutLineReplaceItemDto)
  lines!: CheckoutLineReplaceItemDto[];
}
