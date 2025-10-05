import { IsOptional, IsString, MaxLength, MinLength, IsObject } from "class-validator";
import { IsGlobalId } from "@src/application/validation/globalIdValidators";

export class CheckoutPaymentMethodUpdateDto {
  @IsGlobalId({ message: "Invalid checkout ID format" })
  checkoutId!: string;

  @IsString({ message: "Payment method code must be a string" })
  @MinLength(1, { message: "Payment method code is required" })
  @MaxLength(100, { message: "Payment method code too long" })
  paymentMethodCode!: string;

  @IsOptional()
  @IsObject({ message: "data must be JSON object" })
  data?: Record<string, unknown>;
}
