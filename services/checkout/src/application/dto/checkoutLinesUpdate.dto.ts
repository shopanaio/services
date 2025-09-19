import { Expose, Type } from "class-transformer";
import { IsArray, IsInt, IsNotEmpty, IsString, Min, ValidateNested } from "class-validator";

export class CheckoutLineUpdateItemDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  lineId!: string;

  @Expose()
  @IsInt()
  @Min(0)
  quantity!: number; // 0 = remove line
}

export class CheckoutLinesUpdateDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  checkoutId!: string;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutLineUpdateItemDto)
  lines!: CheckoutLineUpdateItemDto[];
}
