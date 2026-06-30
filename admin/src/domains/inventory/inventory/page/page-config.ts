import type {
  FilterTransformer,
  OrderByInput,
  SortFieldMapping,
  UsePageConfigReturn,
} from "@/hooks";
import {
  createGraphqlIntFilterTransformer,
  createGraphqlStringFilterTransformer,
} from "@/layouts/filters";
import type {
  ApiInventoryItemOrderByInput,
  ApiInventoryItemWhereInput,
} from "@/graphql/types";
import { InventoryItemOrderField } from "@/graphql/types";
import type { InventoryItemsQueryVariables } from "../graphql/operation-types";

export const inventorySortFieldMapping: SortFieldMapping<InventoryItemOrderField> =
  {
    productTitle: InventoryItemOrderField.ProductName,
    sku: InventoryItemOrderField.Sku,
    onHand: InventoryItemOrderField.QuantityOnHand,
    unavailable: InventoryItemOrderField.UnavailableQuantity,
    reserved: InventoryItemOrderField.ReservedQuantity,
    available: InventoryItemOrderField.AvailableForSale,
  };

export const buildInventorySearchCondition = (
  search: string,
): Partial<ApiInventoryItemWhereInput> => ({
  _or: [
    { productName: { _containsi: search } },
    { sku: { _containsi: search } },
  ],
});

export const inventoryFilterTransformers: Record<
  string,
  FilterTransformer<ApiInventoryItemWhereInput>
> = {
  sku: createGraphqlStringFilterTransformer<ApiInventoryItemWhereInput>("sku"),
  quantityOnHand:
    createGraphqlIntFilterTransformer<ApiInventoryItemWhereInput>(
      "quantityOnHand",
    ),
  unavailableQuantity:
    createGraphqlIntFilterTransformer<ApiInventoryItemWhereInput>(
      "unavailableQuantity",
    ),
  reservedQuantity:
    createGraphqlIntFilterTransformer<ApiInventoryItemWhereInput>(
      "reservedQuantity",
    ),
  availableForSale:
    createGraphqlIntFilterTransformer<ApiInventoryItemWhereInput>(
      "availableForSale",
    ),
};

export function buildInventoryItemsQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<ApiInventoryItemWhereInput, InventoryItemOrderField>,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): InventoryItemsQueryVariables {
  return {
    first: pageConfig.first,
    after: pageConfig.after,
    last: pageConfig.last,
    before: pageConfig.before,
    where: pageConfig.where ?? null,
    orderBy: (pageConfig.orderBy ?? null) as
      | ApiInventoryItemOrderByInput[]
      | null,
    meta: null,
  };
}

export function toInventoryItemsQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<object, string>,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): InventoryItemsQueryVariables {
  return buildInventoryItemsQueryVariables({
    ...pageConfig,
    where: pageConfig.where as ApiInventoryItemWhereInput | undefined,
    orderBy: pageConfig.orderBy as
      | OrderByInput<InventoryItemOrderField>[]
      | undefined,
  });
}
