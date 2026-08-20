import { Transactional } from "@shopana/shared-kernel";
import { BaseScript } from "../../kernel/BaseScript.js";
import {
  internalWishlistError,
  isValidExpectedTimestamp,
  normalizeWishlistName,
  wishlistError,
  type WishlistReference,
  type WishlistUserError,
} from "./types.js";

export interface WishlistUpdateParams {
  customerId: string;
  wishlistId: string;
  name: string;
  expectedUpdatedAt: string;
}

export interface WishlistUpdateResult {
  wishlist: WishlistReference | null;
  userErrors: WishlistUserError[];
}

export class WishlistUpdateScript extends BaseScript<WishlistUpdateParams, WishlistUpdateResult> {
  @Transactional()
  protected async execute(params: WishlistUpdateParams): Promise<WishlistUpdateResult> {
    if (!isValidExpectedTimestamp(params.expectedUpdatedAt)) {
      return {
        wishlist: null,
        userErrors: [
          wishlistError("INVALID_UPDATED_AT", "Expected update timestamp is invalid", [
            "expectedUpdatedAt",
          ]),
        ],
      };
    }
    const normalized = normalizeWishlistName(params.name);
    if (normalized.name === null) {
      return { wishlist: null, userErrors: normalized.userErrors };
    }

    const result = await this.repository.wishlist.updateName({
      customerId: params.customerId,
      wishlistId: params.wishlistId,
      expectedUpdatedAt: params.expectedUpdatedAt,
      name: normalized.name,
      normalizedName: normalized.normalizedName,
    });
    if (result.status === "not_found") {
      return {
        wishlist: null,
        userErrors: [wishlistError("NOT_FOUND", "Wishlist was not found", ["id"])],
      };
    }
    if (result.status === "name_taken") {
      return {
        wishlist: null,
        userErrors: [
          wishlistError("WISHLIST_NAME_TAKEN", "A wishlist with this name already exists", [
            "name",
          ]),
        ],
      };
    }
    if (result.status === "conflict") {
      return {
        wishlist: null,
        userErrors: [
          wishlistError("UPDATED_AT_CONFLICT", "Wishlist was modified by another request", [
            "expectedUpdatedAt",
          ]),
        ],
      };
    }
    return { wishlist: { id: result.value.id }, userErrors: [] };
  }

  protected handleError(_error: unknown): WishlistUpdateResult {
    return { wishlist: null, userErrors: [internalWishlistError()] };
  }
}
