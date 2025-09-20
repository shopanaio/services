import { Expose } from "class-transformer";
import { IsNotEmpty, IsString } from "class-validator";

/**
 * DTO for orderLinesClear API. Mirrors OrderLinesClearInput from GraphQL schema.
 */
export class OrderLinesClearDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  orderId!: string;
}
