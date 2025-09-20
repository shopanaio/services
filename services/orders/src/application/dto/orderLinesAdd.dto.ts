import { Expose, Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { OrderLineInputDto } from '@src/application/dto/createOrder.dto';

/**
 * DTO for orderLinesAdd API. Mirrors OrderLinesAddInput from GraphQL schema.
 */
export class OrderLinesAddDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @Expose()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderLineInputDto)
  lines!: OrderLineInputDto[];
}
