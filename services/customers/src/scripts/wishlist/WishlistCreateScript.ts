import { Transactional } from "@shopana/shared-kernel";
import { BaseScript } from "../../kernel/BaseScript.js";
import {
  internalWishlistError,
  normalizeWishlistName,
  wishlistError,
  type WishlistReference,
  type WishlistUserError,
} from "./types.js";

export interface WishlistCreateParams {
  customerId: string;
  name: string;
}

export interface WishlistCreateResult {
  wishlist: WishlistReference | null;
  userErrors: WishlistUserError[];
}

export class WishlistCreateScript extends BaseScript<
  WishlistCreateParams,
  WishlistCreateResult
> {
  @Transactional()
  protected async execute(
    params: WishlistCreateParams,
  ): Promise<WishlistCreateResult> {
    const normalized = normalizeWishlistName(params.name);
    if (normalized.name === null) {
      return { wishlist: null, userErrors: normalized.userErrors };
    }
    const result = await this.repository.wishlist.create({
      customerId: params.customerId,
      name: normalized.name,
      normalizedName: normalized.normalizedName,
    });
    if (result.status === "customer_not_found") {
      return {
        wishlist: null,
        userErrors: [wishlistError("NOT_FOUND", "Customer was not found")],
      };
    }
    if (result.status === "name_taken") {
      return {
        wishlist: null,
        userErrors: [
          wishlistError(
            "WISHLIST_NAME_TAKEN",
            "A wishlist with this name already exists",
            ["name"],
          ),
        ],
      };
    }
    return { wishlist: { id: result.value.id }, userErrors: [] };
  }

  protected handleError(_error: unknown): WishlistCreateResult {
    return { wishlist: null, userErrors: [internalWishlistError()] };
  }
}
