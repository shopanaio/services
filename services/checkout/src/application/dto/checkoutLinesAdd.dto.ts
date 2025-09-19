import { Expose, Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { CheckoutLineInputDto } from '@src/application/dto/createCheckout.dto';

/**
 * DTO for checkoutLinesAdd API. Mirrors CheckoutLinesAddInput from GraphQL schema.
 */
export class CheckoutLinesAddDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  checkoutId!: string;

  @Expose()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutLineInputDto)
  lines!: CheckoutLineInputDto[];
}
