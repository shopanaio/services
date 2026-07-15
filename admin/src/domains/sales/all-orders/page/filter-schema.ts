import { FilterType, booleanOperators, dateOperators, enumOperators, numberOperators, priceOperators, relationOperators, stringOperators } from "@/layouts/filters";
import type { IFilterSchema } from "@/layouts/filters/core/types";
import { OrderFulfillmentStatus, OrderPaymentStatus, OrderStatus } from "../graphql/operation-types";
const options = <T extends string>(values: T[]) => values.map((value) => ({ value, label: value.replaceAll("_", " ") }));
export const filterSchema: IFilterSchema[] = [
  { key: "status", label: "Order status", type: FilterType.Enum, operators: enumOperators, payloadKey: "status", options: options(Object.values(OrderStatus)) },
  { key: "paymentStatus", label: "Payment status", type: FilterType.Enum, operators: enumOperators, payloadKey: "paymentStatus", options: options(Object.values(OrderPaymentStatus)) },
  { key: "fulfillmentStatus", label: "Fulfillment status", type: FilterType.Enum, operators: enumOperators, payloadKey: "fulfillmentStatus", options: options(Object.values(OrderFulfillmentStatus)) },
  { key: "createdAt", label: "Created", type: FilterType.DateRange, operators: dateOperators, payloadKey: "createdAt" },
  { key: "updatedAt", label: "Updated", type: FilterType.DateRange, operators: dateOperators, payloadKey: "updatedAt" },
  { key: "customer", label: "Customer", type: FilterType.Relation, operators: relationOperators, payloadKey: "customerId", entity: "customer" },
  { key: "customerEmail", label: "Customer email", type: FilterType.String, operators: stringOperators, payloadKey: "customerEmail" },
  { key: "customerPhone", label: "Customer phone", type: FilterType.String, operators: stringOperators, payloadKey: "customerPhone" },
  { key: "orderNumber", label: "Order number", type: FilterType.Integer, operators: numberOperators, payloadKey: "orderNumber" },
  { key: "totalAmount", label: "Total amount", type: FilterType.Price, operators: priceOperators, payloadKey: "totalAmount" },
  { key: "currency", label: "Currency", type: FilterType.Enum, operators: enumOperators, payloadKey: "currencyCode", options: options(["USD", "EUR", "UAH"]) },
  { key: "shippingCountry", label: "Shipping country", type: FilterType.String, operators: stringOperators, payloadKey: "shippingCountry" },
  { key: "shippingMethod", label: "Shipping method", type: FilterType.Enum, operators: enumOperators, payloadKey: "shippingMethodId", options: [{ value: "standard", label: "Standard" }, { value: "express", label: "Express" }] },
  { key: "paymentMethod", label: "Payment method", type: FilterType.Enum, operators: enumOperators, payloadKey: "paymentMethodId", options: [{ value: "card", label: "Credit card" }, { value: "cod", label: "Cash on delivery" }] },
  { key: "tags", label: "Tags", type: FilterType.String, operators: stringOperators, payloadKey: "tag" },
  { key: "hasTracking", label: "Has tracking", type: FilterType.Boolean, operators: booleanOperators, payloadKey: "hasTracking" },
  { key: "trackingCode", label: "Tracking code", type: FilterType.String, operators: stringOperators, payloadKey: "trackingCode" },
];
