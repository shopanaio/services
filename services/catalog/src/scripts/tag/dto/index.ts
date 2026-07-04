import type { UserError } from "../../../kernel/BaseScript.js";
import type { FacetReferenceChange } from "@shopana/events";
import type { Tag } from "../../../repositories/models/index.js";

// ============ Create ============

export interface TagCreateParams {
  handle: string;
  name?: string;
}

export interface TagCreateResult {
  tag?: Tag;
  facetReferenceRefs?: FacetReferenceChange[];
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
  facetReferenceRefs?: FacetReferenceChange[];
  userErrors: UserError[];
}

// ============ Delete ============

export interface TagDeleteParams {
  id: string;
}

export interface TagDeleteResult {
  deletedTagId?: string;
  facetReferenceRefs?: FacetReferenceChange[];
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
