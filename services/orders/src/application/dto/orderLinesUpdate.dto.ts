import { Expose, Type } from "class-transformer";
import { IsArray, IsInt, IsNotEmpty, IsString, Min, ValidateNested } from "class-validator";

export class OrderLineUpdateItemDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  lineId!: string;

  @Expose()
  @IsInt()
  @Min(0)
  quantity!: number; // 0 = remove line
}

export class OrderLinesUpdateDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderLineUpdateItemDto)
  lines!: OrderLineUpdateItemDto[];
}
