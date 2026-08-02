import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { IsGlobalId } from "@src/application/validation/globalIdValidators";

export class PlaceOrderDto {
  @IsGlobalId({
    entityType: GlobalIdEntity.Checkout,
    message: "Invalid checkout ID format",
  })
  checkoutId!: string;

  @IsInt()
  @Min(1)
  expectedCheckoutVersion!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  expectedResultRevision!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  idempotencyKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  returnUrl?: string | null;
}
