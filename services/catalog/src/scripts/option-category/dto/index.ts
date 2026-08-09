import type { UserError } from "../../../kernel/BaseScript.js";
import type { ProductOptionCategory } from "../../../repositories/models/index.js";

export interface OptionCategoryCreateParams {
  name: string;
  slug: string;
}

export interface OptionCategoryUpdateParams {
  id: string;
  name?: string;
  slug?: string;
}

export interface OptionCategoryDeleteParams {
  id: string;
}

export interface OptionCategoryMutationResult {
  category?: ProductOptionCategory;
  userErrors: UserError[];
}

export interface OptionCategoryDeleteResult {
  deletedCategoryId?: string;
  userErrors: UserError[];
}
