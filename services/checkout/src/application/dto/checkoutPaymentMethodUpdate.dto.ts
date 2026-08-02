import { IsOptional, IsString, MaxLength, MinLength, IsObject } from "class-validator";
import { IsGlobalId } from "@src/application/validation/globalIdValidators";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import type { CheckoutPipelineJsonObject } from "../pipeline/contracts/index.js";

export class CheckoutPaymentMethodUpdateDto {
  @IsGlobalId({ entityType: GlobalIdEntity.Checkout, message: "Invalid checkout ID format" })
  checkoutId!: string;

  @IsString({ message: "Method handle must be a string" })
  @MinLength(1, { message: "Method handle is required" })
  @MaxLength(256, { message: "Method handle too long" })
  methodHandle!: string;

  @IsOptional()
  @IsObject({ message: "customerInput must be a JSON object" })
  customerInput?: CheckoutPipelineJsonObject;
}
