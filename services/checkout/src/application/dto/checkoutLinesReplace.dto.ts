import { Expose, Type } from "class-transformer";
import { IsGlobalId } from "@src/application/validation/globalIdValidators";
import { IsArray, ValidateNested, IsInt, Min, IsOptional } from "class-validator";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";

export class CheckoutLineReplaceItemDto {
  @Expose()
  @IsGlobalId({ entityType: GlobalIdEntity.CheckoutLine, message: "Invalid source line ID format" })
  lineId!: string;

  @Expose()
  @IsGlobalId({
    entityType: GlobalIdEntity.Variant,
    message: "Invalid target purchasable ID format",
  })
  purchasableId!: string;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

/**
 * DTO for checkoutLinesReplace API. Mirrors CheckoutLinesReplaceInput from GraphQL schema.
 */
export class CheckoutLinesReplaceDto {
  @Expose()
  @IsGlobalId({ entityType: GlobalIdEntity.Checkout, message: "Invalid checkout ID format" })
  checkoutId!: string;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutLineReplaceItemDto)
  lines!: CheckoutLineReplaceItemDto[];
}
