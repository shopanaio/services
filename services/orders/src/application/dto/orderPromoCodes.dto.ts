import { Expose } from "class-transformer";
import { IsString, IsNotEmpty, IsUUID, IsOptional, MinLength, MaxLength } from "class-validator";

/**
 * DTO for orderPromoCodeAdd API.
 */
export class OrderPromoCodeAddDto {
  @Expose()
  @IsUUID(7, { message: "Invalid order ID format" })
  orderId!: string;

  @Expose()
  @IsString({ message: "Promo code must be a string" })
  @IsNotEmpty({ message: "Promo code cannot be empty" })
  @MaxLength(50, { message: "Promo code too long" })
  code!: string;

  @Expose()
  @IsOptional()
  @IsString({ message: "Idempotency key must be a string" })
  @MinLength(1, { message: "Idempotency key cannot be empty" })
  idempotencyKey?: string;
}

/**
 * DTO for orderPromoCodeRemove API.
 */
export class OrderPromoCodeRemoveDto {
  @Expose()
  @IsUUID(7, { message: "Invalid order ID format" })
  orderId!: string;

  @Expose()
  @IsString({ message: "Promo code must be a string" })
  @IsNotEmpty({ message: "Promo code cannot be empty" })
  @MaxLength(50, { message: "Promo code too long" })
  code!: string;

  @Expose()
  @IsOptional()
  @IsString({ message: "Idempotency key must be a string" })
  @MinLength(1, { message: "Idempotency key cannot be empty" })
  idempotencyKey?: string;
}
