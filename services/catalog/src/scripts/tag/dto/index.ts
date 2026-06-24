import type { UserError } from "../../../kernel/BaseScript.js";
import type { Tag } from "../../../repositories/models/index.js";

// ============ Create ============

export interface TagCreateParams {
  handle: string;
  name?: string;
}

export interface TagCreateResult {
  tag?: Tag;
  userErrors: UserError[];
}

// ============ Update ============

export interface TagUpdateParams {
  id: string;
  handle?: string;
  name?: string;
}

export interface TagUpdateResult {
  tag?: Tag;
  userErrors: UserError[];
}

// ============ Delete ============

export interface TagDeleteParams {
  id: string;
}

export interface TagDeleteResult {
  deletedTagId?: string;
  userErrors: UserError[];
}

// ============ Product Tag Assignment ============

export interface ProductTagAddParams {
  productId: string;
  tagId: string;
}

export interface ProductTagAddResult {
  tag?: Tag;
  affectedProductIds: string[];
  userErrors: UserError[];
}

export interface ProductTagRemoveParams {
  productId: string;
  tagId: string;
}

export interface ProductTagRemoveResult {
  tag?: Tag;
  affectedProductIds: string[];
  userErrors: UserError[];
}
