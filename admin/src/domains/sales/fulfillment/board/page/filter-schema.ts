import { FilterOperator, FilterType } from "@/layouts/filters";
import type { IFilterSchema } from "@/layouts/filters/core/types";
import { FulfillmentOrderStatus, FulfillmentPaymentStatus, FulfillmentStatus } from "../graphql/operation-types";

const options = (values: string[]) => values.map((value) => ({ value, label: value.replaceAll("_", " ").toLowerCase() }));
export const fulfillmentFilterSchema: IFilterSchema[] = [
  { key: "orderStatus", label: "Order status", type: FilterType.Enum, operators: [FilterOperator.In], payloadKey: "orderStatus", options: options(Object.values(FulfillmentOrderStatus)) },
  { key: "paymentStatus", label: "Payment status", type: FilterType.Enum, operators: [FilterOperator.In], payloadKey: "paymentStatus", options: options(Object.values(FulfillmentPaymentStatus)) },
  { key: "fulfillmentStatus", label: "Fulfillment status", type: FilterType.Enum, operators: [FilterOperator.In], payloadKey: "fulfillmentStatus", options: options(Object.values(FulfillmentStatus)) },
  { key: "createdAt", label: "Created", type: FilterType.DateRange, operators: [FilterOperator.Between], payloadKey: "createdAt" },
];
