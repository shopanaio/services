import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";
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

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Matches(/\S/, { message: "Idempotency key cannot be blank" })
  idempotencyKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  returnUrl?: string | null;
}
