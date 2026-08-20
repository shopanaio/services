import { Transactional } from "@shopana/shared-kernel";
import { BaseScript } from "../../kernel/BaseScript.js";
import { internalWishlistError, wishlistError, type WishlistUserError } from "./types.js";

export interface WishlistProductRemoveParams {
  customerId: string;
  itemId: string;
}

export interface WishlistProductRemoveResult {
  deletedWishlistItemId: string | null;
  userErrors: WishlistUserError[];
}

export class WishlistProductRemoveScript extends BaseScript<
  WishlistProductRemoveParams,
  WishlistProductRemoveResult
> {
  @Transactional()
  protected async execute(
    params: WishlistProductRemoveParams,
  ): Promise<WishlistProductRemoveResult> {
    const item = await this.repository.wishlist.removeItem(params.customerId, params.itemId);
    return item
      ? { deletedWishlistItemId: item.id, userErrors: [] }
      : {
          deletedWishlistItemId: null,
          userErrors: [wishlistError("NOT_FOUND", "Wishlist item was not found", ["itemId"])],
        };
  }

  protected handleError(_error: unknown): WishlistProductRemoveResult {
    return {
      deletedWishlistItemId: null,
      userErrors: [internalWishlistError()],
    };
  }
}
