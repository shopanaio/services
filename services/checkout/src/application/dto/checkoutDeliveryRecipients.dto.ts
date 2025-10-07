import { Type } from "class-transformer";
import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import {
  IsGlobalId,
  IsGlobalIdArray,
} from "@src/application/validation/globalIdValidators";

/**
 * DTO for single recipient (corresponds to CheckoutRecipientInput)
 */
export class CheckoutRecipientInputDto {
  @IsOptional()
  @IsString({ message: "First name must be a string" })
  firstName?: string | null;

  @IsOptional()
  @IsString({ message: "Last name must be a string" })
  lastName?: string | null;

  @IsOptional()
  @IsString({ message: "Middle name must be a string" })
  middleName?: string | null;

  @IsOptional()
  @IsEmail({}, { message: "Invalid email format" })
  email?: string | null;

  @IsOptional()
  @IsString({ message: "Phone must be a string" })
  phone?: string | null;
}

/**
 * DTO for updating single recipient (corresponds to CheckoutDeliveryRecipientUpdateInput)
 */
export class CheckoutDeliveryRecipientUpdateDto {
  @IsGlobalId({
    message: "Invalid delivery group ID format",
  })
  deliveryGroupId!: string;

  @ValidateNested()
  @Type(() => CheckoutRecipientInputDto)
  recipient!: CheckoutRecipientInputDto;
}

/**
 * DTO for adding recipients (corresponds to CheckoutDeliveryRecipientsAddInput)
 */
export class CheckoutDeliveryRecipientsAddDto {
  @IsGlobalId({
    message: "Invalid checkout ID format",
  })
  checkoutId!: string;

  @IsArray({ message: "Recipients must be an array" })
  @ValidateNested({ each: true })
  @Type(() => CheckoutDeliveryRecipientUpdateDto)
  recipients!: CheckoutDeliveryRecipientUpdateDto[];
}

/**
 * DTO for batch updating recipients (corresponds to CheckoutDeliveryRecipientsUpdateInput)
 */
export class CheckoutDeliveryRecipientsUpdateDto {
  @IsGlobalId({
    message: "Invalid checkout ID format",
  })
  checkoutId!: string;

  @IsArray({ message: "Updates must be an array" })
  @ValidateNested({ each: true })
  @Type(() => CheckoutDeliveryRecipientUpdateDto)
  updates!: CheckoutDeliveryRecipientUpdateDto[];
}

/**
 * DTO for removing recipients (corresponds to CheckoutDeliveryRecipientsRemoveInput)
 */
export class CheckoutDeliveryRecipientsRemoveDto {
  @IsGlobalId({
    message: "Invalid checkout ID format",
  })
  checkoutId!: string;

  @IsArray({ message: "DeliveryGroupIds must be an array" })
  @IsGlobalIdArray({
    message: "Each delivery group ID must be a valid Global ID",
  })
  deliveryGroupIds!: string[];
}
