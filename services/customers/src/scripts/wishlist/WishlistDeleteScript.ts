import { Transactional } from "@shopana/shared-kernel";
import { BaseScript } from "../../kernel/BaseScript.js";
import {
  internalWishlistError,
  isValidExpectedTimestamp,
  wishlistError,
  type WishlistUserError,
} from "./types.js";

export interface WishlistDeleteParams {
  customerId: string;
  wishlistId: string;
  expectedUpdatedAt: string;
}

export interface WishlistDeleteResult {
  deletedWishlistId: string | null;
  userErrors: WishlistUserError[];
}

export class WishlistDeleteScript extends BaseScript<WishlistDeleteParams, WishlistDeleteResult> {
  @Transactional()
  protected async execute(params: WishlistDeleteParams): Promise<WishlistDeleteResult> {
    if (!isValidExpectedTimestamp(params.expectedUpdatedAt)) {
      return {
        deletedWishlistId: null,
        userErrors: [
          wishlistError("INVALID_UPDATED_AT", "Expected update timestamp is invalid", [
            "expectedUpdatedAt",
          ]),
        ],
      };
    }
    const result = await this.repository.wishlist.delete(params);
    if (result.status === "not_found") {
      return {
        deletedWishlistId: null,
        userErrors: [wishlistError("NOT_FOUND", "Wishlist was not found", ["id"])],
      };
    }
    if (result.status === "default_protected") {
      return {
        deletedWishlistId: null,
        userErrors: [
          wishlistError(
            "DEFAULT_WISHLIST_DELETE_FORBIDDEN",
            "The default wishlist cannot be deleted",
            ["id"],
          ),
        ],
      };
    }
    if (result.status === "conflict") {
      return {
        deletedWishlistId: null,
        userErrors: [
          wishlistError("UPDATED_AT_CONFLICT", "Wishlist was modified by another request", [
            "expectedUpdatedAt",
          ]),
        ],
      };
    }
    if (result.status === "name_taken") {
      return {
        deletedWishlistId: null,
        userErrors: [internalWishlistError()],
      };
    }
    return { deletedWishlistId: result.value.id, userErrors: [] };
  }

  protected handleError(_error: unknown): WishlistDeleteResult {
    return { deletedWishlistId: null, userErrors: [internalWishlistError()] };
  }
}
