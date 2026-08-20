import type { Catalog } from "@shopana/broker-types";
import type { ServiceBroker } from "@shopana/shared-kernel";
import DataLoader from "dataloader";
import type { CustomerWishlist, CustomerWishlistItem } from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";
import { mapById } from "./batch.js";

export interface CustomerWishlistLoaderOptions {
  customerId?: string;
  storeId?: string;
  broker?: ServiceBroker;
}

export class CustomerWishlistLoader {
  readonly wishlist: DataLoader<string, CustomerWishlist | null>;
  readonly wishlistItem: DataLoader<string, CustomerWishlistItem | null>;
  readonly defaultWishlist: DataLoader<string, CustomerWishlist | null>;
  readonly publishedWishlistProduct: DataLoader<string, boolean>;

  constructor(repository: Repository, options: CustomerWishlistLoaderOptions = {}) {
    this.wishlist = new DataLoader(async (ids) =>
      options.customerId
        ? mapById(ids, await repository.wishlist.getByIds(options.customerId, ids))
        : ids.map(() => null),
    );
    this.wishlistItem = new DataLoader(async (ids) =>
      options.customerId
        ? mapById(ids, await repository.wishlist.getItemsByIds(options.customerId, ids))
        : ids.map(() => null),
    );
    this.defaultWishlist = new DataLoader(async (customerIds) => {
      const allowedIds = options.customerId
        ? customerIds.filter((id) => id === options.customerId)
        : [];
      const rows = await repository.wishlist.getDefaultByCustomerIds(allowedIds);
      const byCustomerId = new Map(rows.map((row) => [row.customerId, row]));
      return customerIds.map((id) => byCustomerId.get(id) ?? null);
    });
    this.publishedWishlistProduct = new DataLoader(
      async (productIds) => loadPublishedProducts(options.broker, options.storeId, productIds),
      { maxBatchSize: 100 },
    );
  }
}

async function loadPublishedProducts(
  broker: ServiceBroker | undefined,
  storeId: string | undefined,
  productIds: readonly string[],
): Promise<boolean[]> {
  if (!broker || !storeId || productIds.length === 0) {
    return productIds.map(() => false);
  }
  try {
    const result = await broker.call<Catalog.CatalogQueryResult, Catalog.CatalogQueryParams>(
      "catalog.query",
      {
        storeId,
        selection: {
          populate: {
            products: {
              args: {
                first: productIds.length,
                where: { id: { _in: [...new Set(productIds)] } },
              },
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
    if (!result.ok) return productIds.map(() => false);

    const now = Date.now();
    const published = new Set(
      (result.data.products?.edges ?? []).flatMap((edge) => {
        const product = edge.node;
        return product?.status === "published" &&
          product.storeId === storeId &&
          product.publishedAt &&
          Date.parse(product.publishedAt) <= now
          ? [product.id]
          : [];
      }),
    );
    return productIds.map((id) => published.has(id));
  } catch {
    return productIds.map(() => false);
  }
}
