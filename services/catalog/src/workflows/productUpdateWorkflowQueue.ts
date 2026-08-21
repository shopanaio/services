export const CATALOG_AGGREGATE_MUTATIONS_QUEUE = "catalog_aggregate_mutations" as const;

export function buildProductUpdateQueuePartitionKey(input: {
  storeId: string;
  productId: string;
}): string {
  return [input.storeId, "product", input.productId].join(":");
}
