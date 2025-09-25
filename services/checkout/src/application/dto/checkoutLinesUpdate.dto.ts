import { Expose, Type } from "class-transformer";
import { IsArray, IsInt, Min, ValidateNested } from "class-validator";
import { IsGlobalId } from "@src/application/validation/globalIdValidators";

export class CheckoutLineUpdateItemDto {
  @Expose()
  @IsGlobalId({ message: "Invalid checkout line ID format" })
  lineId!: string;

  @Expose()
  @IsInt()
  @Min(0)
  quantity!: number; // 0 = remove line
}

export class CheckoutLinesUpdateDto {
  @Expose()
  @IsGlobalId({ message: "Invalid checkout ID format" })
  checkoutId!: string;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutLineUpdateItemDto)
  lines!: CheckoutLineUpdateItemDto[];
}
