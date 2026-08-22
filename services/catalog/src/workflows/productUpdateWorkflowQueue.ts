export const CATALOG_AGGREGATE_MUTATIONS_QUEUE = "catalog_aggregate_mutations" as const;

export function buildProductUpdateQueuePartitionKey(input: {
  storeId: string;
  productId: string;
}): string {
  return [input.storeId, "product", input.productId].join(":");
}

export function buildCategoryUpdateQueuePartitionKey(input: {
  storeId: string;
  categoryId: string;
}): string {
  return [input.storeId, "category", input.categoryId].join(":");
}

export function buildCatalogAggregateQueuePartitionKey(input: {
  storeId: string;
  entityType: string;
  entityId: string;
}): string {
  return [input.storeId, input.entityType, input.entityId].join(":");
}
