import { IsString, IsOptional, MinLength, MaxLength, IsObject } from "class-validator";
import { IsGlobalId } from "@src/application/validation/globalIdValidators";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import type { CheckoutPipelineJsonObject } from "../pipeline/contracts/index.js";

export class CheckoutDeliveryMethodUpdateInput {
  @IsGlobalId({
    entityType: GlobalIdEntity.Checkout,
    message: "Invalid checkout ID format",
  })
  checkoutId!: string;

  @IsString({ message: "Option handle must be a string" })
  @MinLength(1, { message: "Option handle is required" })
  @MaxLength(256, { message: "Option handle too long" })
  optionHandle!: string;

  @IsGlobalId({
    entityType: GlobalIdEntity.CheckoutDeliveryGroup,
    message: "Invalid delivery group ID format",
  })
  deliveryGroupId!: string;

  @IsOptional()
  @IsObject({ message: "customerInput must be a JSON object" })
  customerInput?: CheckoutPipelineJsonObject;
}
