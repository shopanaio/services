import { Expose } from "class-transformer";
import { ArrayMinSize, IsArray, IsNotEmpty, IsString } from "class-validator";

/**
 * DTO for orderLinesDelete API. Mirrors OrderLinesDeleteInput from GraphQL schema.
 */
export class OrderLinesDeleteDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @Expose()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  lineIds!: string[];
}
