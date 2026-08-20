import type { Catalog } from "@shopana/broker-types";

export function buildProductSnapshotSelection(
  productId: string
): Catalog.CatalogQuerySelection {
  return buildProductSnapshotSelectionFromArgs({
    first: 1,
    where: {
      id: {
        _eq: productId,
      },
    },
  });
}

export function buildProductSnapshotBatchSelection(
  productIds: readonly string[]
): Catalog.CatalogQuerySelection {
  return buildProductSnapshotSelectionFromArgs({
    first: productIds.length,
    where: {
      id: {
        _in: [...productIds],
      },
    },
  });
}

function buildProductSnapshotSelectionFromArgs(
  args: Catalog.CatalogQueryProductsArgs
): Catalog.CatalogQuerySelection {
  return {
    populate: {
      products: {
        fieldName: "products",
        args,
        populate: {
          edges: {
            fieldName: "edges",
            populate: {
              node: {
                fields: [
                  "snapshotVersion",
                  "id",
                  "storeId",
                  "revision",
                  "status",
                  "publishedAt",
                  "createdAt",
                  "updatedAt",
                  "handle",
                  "vendorId",
                ],
                populate: {
                  content: {
                    fieldName: "content",
                    fields: ["locale", "title"],
                    populate: {
                      description: {
                        fieldName: "description",
                        fields: ["text"],
                      },
                    },
                  },
                  seo: {
                    fieldName: "seo",
                    fields: ["locale", "seoTitle", "seoDescription"],
                  },
                  vendor: {
                    fieldName: "vendor",
                    fields: ["id", "name"],
                  },
                  availability: {
                    fieldName: "availability",
                    fields: ["availableForSale", "totalQuantity"],
                  },
                  primaryCategory: {
                    fieldName: "primaryCategory",
                    fields: ["id", "primary", "manualRank"],
                    populate: {
                      content: {
                        fieldName: "content",
                        fields: ["locale", "name"],
                      },
                    },
                  },
                  categories: {
                    fieldName: "categories",
                    fields: ["id", "primary", "manualRank"],
                    populate: {
                      content: {
                        fieldName: "content",
                        fields: ["locale", "name"],
                      },
                    },
                  },
                  tags: {
                    fieldName: "tags",
                    fields: ["id", "handle"],
                  },
                  features: {
                    fieldName: "features",
                    fields: ["id", "handle"],
                    populate: {
                      values: {
                        fieldName: "values",
                        fields: ["id", "handle"],
                      },
                    },
                  },
                  collections: {
                    fieldName: "collections",
                    fields: ["id", "manualRank"],
                  },
                  variants: {
                    fieldName: "variants",
                    fields: ["id", "handle", "isDefault", "createdAt", "updatedAt"],
                    populate: {
                      availability: {
                        fieldName: "availability",
                        fields: ["availableForSale", "totalQuantity"],
                      },
                      prices: {
                        fieldName: "prices",
                        fields: ["currencyCode", "amountMinor"],
                      },
                      content: {
                        fieldName: "content",
                        fields: ["locale", "title"],
                      },
                      inventoryItem: {
                        fieldName: "inventoryItem",
                        fields: ["id", "sku"],
                      },
                      options: {
                        fieldName: "options",
                        fields: ["id", "handle"],
                        populate: {
                          values: {
                            fieldName: "values",
                            fields: ["id", "handle"],
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}
