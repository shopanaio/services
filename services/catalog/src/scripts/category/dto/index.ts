import type { UserError } from "../../../kernel/BaseScript.js";
import type { Category } from "../../../repositories/models/index.js";

// ============ Create ============

export interface CategoryCreateParams {
  handle: string;
  name: string;
  parentId?: string | null;
  description?: {
    text?: string;
    html?: string;
    json?: Record<string, unknown>;
  };
  mediaFileIds?: string[];
  publish?: boolean;
}

export interface CategoryCreateResult {
  category?: Category;
  userErrors: UserError[];
}

// ============ Update ============

export interface CategoryUpdateParams {
  id: string;
  handle?: string;
  name?: string;
  description?: {
    text?: string;
    html?: string;
    json?: Record<string, unknown>;
  } | null;
  mediaFileIds?: string[];
}

export interface CategoryUpdateResult {
  category?: Category;
  userErrors: UserError[];
}

// ============ Delete ============

export interface CategoryDeleteParams {
  id: string;
  permanent?: boolean;
}

export interface CategoryDeleteResult {
  deletedCategoryId?: string;
  userErrors: UserError[];
}

// ============ Move ============

export interface CategoryMoveParams {
  id: string;
  newParentId?: string | null;
}

export interface CategoryMoveResult {
  category?: Category;
  userErrors: UserError[];
}
