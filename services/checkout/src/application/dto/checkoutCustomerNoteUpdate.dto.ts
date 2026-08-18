import { IsString, IsOptional, MaxLength } from "class-validator";
import { IsGlobalId } from "@src/application/validation/globalIdValidators";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";

export class CheckoutCustomerNoteUpdateInput {
  @IsGlobalId({
    entityType: GlobalIdEntity.Checkout,
    message: "Invalid checkout ID format",
  })
  checkoutId!: string;

  @IsOptional()
  @IsString({ message: "Note must be a string" })
  @MaxLength(1000, { message: "Note cannot exceed 1000 characters" })
  note?: string | null;
}
