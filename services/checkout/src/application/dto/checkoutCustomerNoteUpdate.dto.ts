import { IsString, IsOptional, MinLength, MaxLength } from "class-validator";
import { IsGlobalId } from "@src/application/validation/globalIdValidators";

export class CheckoutCustomerNoteUpdateInput {
  @IsGlobalId({
    message: "Invalid checkout ID format",
  })
  checkoutId!: string;

  @IsOptional()
  @IsString({ message: "Note must be a string" })
  @MaxLength(1000, { message: "Note cannot exceed 1000 characters" })
  note?: string | null;

  @IsOptional()
  @IsString({ message: "Idempotency key must be a string" })
  @MinLength(1, { message: "Idempotency key cannot be empty" })
  idempotencyKey?: string;
}
