import { BaseScript } from "../../kernel/BaseScript.js";
import { validatePublishedWishlistProduct } from "./CatalogWishlistProduct.js";
import {
  internalWishlistError,
  normalizeWishlistName,
  wishlistError,
  type WishlistItemReference,
  type WishlistUserError,
} from "./types.js";

export interface WishlistProductAddParams {
  customerId: string;
  productId: string;
  wishlistId?: string;
}

export interface WishlistProductAddResult {
  wishlistItem: WishlistItemReference | null;
  userErrors: WishlistUserError[];
}

export class WishlistProductAddScript extends BaseScript<
  WishlistProductAddParams,
  WishlistProductAddResult
> {
  protected async execute(
    params: WishlistProductAddParams,
  ): Promise<WishlistProductAddResult> {
    if (params.wishlistId) {
      const wishlist = await this.repository.wishlist.findById(
        params.customerId,
        params.wishlistId,
      );
      if (!wishlist) return notFound();
    }

    const catalogValidation = await validatePublishedWishlistProduct(
      this.services,
      this.context.store.id,
      params.productId,
    );
    if (!catalogValidation.ok) {
      return { wishlistItem: null, userErrors: [catalogValidation.userError] };
    }

    let wishlistId = params.wishlistId;
    if (!wishlistId) {
      const normalized = normalizeWishlistName("Wishlist");
      if (normalized.name === null) {
        throw new Error("Default wishlist name is invalid");
      }
      const wishlist = await this.repository.wishlist.getOrCreateDefault(
        params.customerId,
        {
          name: normalized.name,
          normalizedName: normalized.normalizedName,
        },
      );
      if (!wishlist) return notFound();
      wishlistId = wishlist.id;
    }

    const item = await this.repository.wishlist.addItem({
      customerId: params.customerId,
      wishlistId,
      productId: params.productId,
    });
    if (!item) return notFound();
    return {
      wishlistItem: {
        id: item.id,
        wishlistId: item.wishlistId,
        productId: item.productId,
      },
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): WishlistProductAddResult {
    return { wishlistItem: null, userErrors: [internalWishlistError()] };
  }
}

function notFound(): WishlistProductAddResult {
  return {
    wishlistItem: null,
    userErrors: [
      wishlistError("NOT_FOUND", "Wishlist was not found", ["wishlistId"]),
    ],
  };
}
