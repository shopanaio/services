import { IsUUID, IsString, IsOptional, MinLength, MaxLength } from "class-validator";

export class CheckoutDeliveryMethodUpdateInput {
  @IsUUID(7, { message: "Invalid checkout ID format" })
  checkoutId!: string;

  @IsString({ message: "Shipping method code must be a string" })
  @MinLength(1, { message: "Shipping method code is required" })
  @MaxLength(100, { message: "Shipping method code too long" })
  shippingMethodCode!: string;

  @IsUUID(7, { message: "Invalid delivery group ID format" })
  deliveryGroupId!: string;

  @IsOptional()
  @IsString({ message: "Idempotency key must be a string" })
  @MinLength(1, { message: "Idempotency key cannot be empty" })
  idempotencyKey?: string;
}
