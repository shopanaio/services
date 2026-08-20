import type { Catalog } from "@shopana/broker-types";
import type { CustomersKernelServices } from "../../kernel/types.js";
import { wishlistError, type WishlistUserError } from "./types.js";

export type CatalogWishlistProductValidation =
  { ok: true } | { ok: false; userError: WishlistUserError };

export async function validatePublishedWishlistProduct(
  services: CustomersKernelServices,
  storeId: string,
  productId: string,
): Promise<CatalogWishlistProductValidation> {
  let result: Catalog.CatalogQueryResult;
  try {
    result = await services.broker.call<Catalog.CatalogQueryResult, Catalog.CatalogQueryParams>(
      "catalog.query",
      {
        storeId,
        selection: {
          populate: {
            products: {
              args: { first: 1, where: { id: { _eq: productId } } },
              populate: {
                edges: {
                  populate: {
                    node: {
                      fields: ["id", "storeId", "status", "publishedAt"],
                    },
                  },
                },
              },
            },
          },
        },
      },
    );
  } catch {
    return {
      ok: false,
      userError: wishlistError(
        "CATALOG_UNAVAILABLE",
        "Catalog availability could not be verified",
        ["productId"],
        true,
      ),
    };
  }

  if (!result.ok) {
    return {
      ok: false,
      userError: wishlistError(
        "CATALOG_UNAVAILABLE",
        "Catalog availability could not be verified",
        ["productId"],
        result.retryable,
      ),
    };
  }

  const product = result.data.products?.edges?.[0]?.node;
  if (!product || product.id !== productId || product.storeId !== storeId) {
    return {
      ok: false,
      userError: wishlistError("PRODUCT_NOT_FOUND", "Product was not found", ["productId"]),
    };
  }
  const publishedAt = product.publishedAt ? Date.parse(product.publishedAt) : Number.NaN;
  if (product.status !== "published" || !Number.isFinite(publishedAt) || publishedAt > Date.now()) {
    return {
      ok: false,
      userError: wishlistError("PRODUCT_NOT_PUBLISHED", "Product is not published", ["productId"]),
    };
  }
  return { ok: true };
}
