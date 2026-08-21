import type { UserError } from "../../kernel/BaseScript.js";

export interface WishlistUserError extends UserError {
  code: string;
  retryable: boolean;
}

export interface WishlistReference {
  id: string;
}

export interface WishlistItemReference {
  id: string;
  wishlistId: string;
  productId: string;
}

export function wishlistError(
  code: string,
  message: string,
  field?: string[],
  retryable = false,
): WishlistUserError {
  return { code, message, field, retryable };
}

export function internalWishlistError(): WishlistUserError {
  return wishlistError(
    "INTERNAL_ERROR",
    "The wishlist operation could not be completed",
    undefined,
    true,
  );
}

export function normalizeWishlistName(
  value: string,
):
  | { name: string; normalizedName: string; userErrors: [] }
  | { name: null; normalizedName: null; userErrors: WishlistUserError[] } {
  const name = value.trim();
  const nameLength = [...name].length;
  if (nameLength < 1 || nameLength > 128) {
    return {
      name: null,
      normalizedName: null,
      userErrors: [
        wishlistError("INVALID_NAME", "Wishlist name must contain between 1 and 128 characters", [
          "name",
        ]),
      ],
    };
  }

  const normalizedName = name.normalize("NFKC").toLowerCase();
  if ([...normalizedName].length > 512) {
    return {
      name: null,
      normalizedName: null,
      userErrors: [wishlistError("INVALID_NAME", "Normalized wishlist name is too long", ["name"])],
    };
  }
  return { name, normalizedName, userErrors: [] };
}
