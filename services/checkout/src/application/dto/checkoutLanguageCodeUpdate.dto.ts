import { IsString, Matches } from "class-validator";
import { IsGlobalId } from "@src/application/validation/globalIdValidators";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";

export class CheckoutLanguageCodeUpdateInput {
  @IsGlobalId({ entityType: GlobalIdEntity.Checkout, message: "Invalid checkout ID format" })
  checkoutId!: string;

  @IsString({ message: "Locale code must be a string" })
  @Matches(/^[a-z]{2}(-[A-Z]{2})?$/, {
    message: "Invalid locale code format (expected: en, en-US, etc.)",
  })
  localeCode!: string;
}
