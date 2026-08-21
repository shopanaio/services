import type { UserError } from "../../../kernel/BaseScript.js";
import type {
  DiscountExternalReferenceCreateInput,
  DiscountExternalReferenceUpdateInput,
} from "../../../resolvers/admin/generated/types.js";

export interface DiscountExternalReferenceCreateParams {
  readonly externalReferenceId: string;
  readonly input: DiscountExternalReferenceCreateInput;
}

export interface DiscountExternalReferenceCreateResult {
  externalReference?: { id: string; discountId: string };
  userErrors: UserError[];
}

export interface DiscountExternalReferenceUpdateParams {
  readonly externalReferenceId: string;
  readonly operations: DiscountExternalReferenceUpdateInput;
}

export interface DiscountExternalReferenceUpdateResult {
  externalReference?: { id: string; discountId: string };
  userErrors: UserError[];
}

export interface DiscountExternalReferenceDeleteParams {
  readonly id: string;
  readonly permanent: boolean;
}

export interface DiscountExternalReferenceDeleteResult {
  deletedExternalReferenceId?: string;
  discountId?: string;
  permanent?: boolean;
  userErrors: UserError[];
}
