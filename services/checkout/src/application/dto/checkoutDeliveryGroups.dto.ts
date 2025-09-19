import { Type } from "class-transformer";
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Min,
  ValidateNested,
} from "class-validator";

// Update Delivery Group Address DTO
export class UpdateDeliveryGroupAddressDto {
  @IsUUID()
  checkoutId!: string;

  @IsUUID()
  deliveryGroupId!: string;

  @IsString()
  @Matches(/\S/, { message: "address1 cannot be blank" })
  address1!: string;

  @IsOptional()
  @IsString()
  address2?: string | null;

  @IsString()
  @Matches(/\S/, { message: "city cannot be blank" })
  city!: string;

  @IsString()
  @Length(2, 3)
  @Matches(/^[A-Z]{2,3}$/)
  countryCode!: string;

  @IsOptional()
  @IsString()
  provinceCode?: string | null;

  @IsOptional()
  @IsString()
  postalCode?: string | null;

  @IsOptional()
  @IsString()
  firstName?: string | null;

  @IsOptional()
  @IsString()
  lastName?: string | null;

  @IsOptional()
  @IsString()
  email?: string | null;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

// Shipping Cost DTO
export class ShippingCostDto {
  @IsInt()
  @Min(0)
  amount!: number; // Minor units (e.g., cents)

  @IsEnum(["MERCHANT_COLLECTED", "CARRIER_DIRECT"])
  paymentModel!: "MERCHANT_COLLECTED" | "CARRIER_DIRECT";
}

// Update Delivery Group Method DTO
export class UpdateDeliveryGroupMethodDto {
  @IsUUID()
  checkoutId!: string;

  @IsUUID()
  deliveryGroupId!: string;

  @IsString()
  @Matches(/\S/, { message: "deliveryMethodId cannot be blank" })
  deliveryMethodId!: string;

  @IsIn(["PICKUP", "SHIPPING"])
  deliveryMethodType!: "PICKUP" | "SHIPPING";

  @IsString()
  @Matches(/\S/, { message: "providerId cannot be blank" })
  providerId!: string;

  @IsString()
  @Matches(/\S/, { message: "name cannot be blank" })
  name!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedDeliveryDays?: number | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingCostDto)
  shippingCost?: ShippingCostDto | null;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

// Remove Delivery Group DTO
export class RemoveDeliveryGroupDto {
  @IsUUID()
  checkoutId!: string;

  @IsUUID()
  deliveryGroupId!: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
