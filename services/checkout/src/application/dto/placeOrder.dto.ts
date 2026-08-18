import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { IsGlobalId } from "@src/application/validation/globalIdValidators";

export class PlaceOrderDto {
  @IsGlobalId({
    entityType: GlobalIdEntity.Checkout,
    message: "Invalid checkout ID format",
  })
  checkoutId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  expectedResultRevision!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  returnUrl?: string | null;
}
