import { Expose, Type } from "class-transformer";
import {
  IsBoolean,
  IsOptional,
  Matches,
  ValidateNested,
} from "class-validator";
import { IsGlobalId } from "@src/application/validation/globalIdValidators";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";

export class CheckoutTagPayloadDto {
  @Expose()
  @Matches(/^[a-zA-Z0-9]+$/, {
    message: "slug must be alphanumeric (a-zA-Z0-9)",
  })
  slug!: string;

  @Expose()
  @IsBoolean()
  unique!: boolean;
}

export class CheckoutTagCreateDto {
  @Expose()
  @IsGlobalId({ entityType: GlobalIdEntity.Checkout, message: "Invalid checkout ID format" })
  checkoutId!: string;

  @Expose()
  @ValidateNested()
  @Type(() => CheckoutTagPayloadDto)
  tag!: CheckoutTagPayloadDto;
}

export class CheckoutTagUpdateDto {
  @Expose()
  @IsGlobalId({ entityType: GlobalIdEntity.Checkout, message: "Invalid checkout ID format" })
  checkoutId!: string;

  @Expose()
  @IsGlobalId({ entityType: GlobalIdEntity.CheckoutTag, message: "Invalid tag ID format" })
  tagId!: string;

  @Expose()
  @IsOptional()
  @Matches(/^[a-zA-Z0-9]+$/, {
    message: "slug must be alphanumeric (a-zA-Z0-9)",
  })
  slug?: string;

  @Expose()
  @IsOptional()
  @IsBoolean()
  unique?: boolean;
}

export class CheckoutTagDeleteDto {
  @Expose()
  @IsGlobalId({ entityType: GlobalIdEntity.Checkout, message: "Invalid checkout ID format" })
  checkoutId!: string;

  @Expose()
  @IsGlobalId({ entityType: GlobalIdEntity.CheckoutTag, message: "Invalid tag ID format" })
  tagId!: string;
}
