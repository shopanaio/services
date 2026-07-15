import { allowedCountries, shopCountries } from "@/defs/localization";
import {
  FilterType,
  dateOperators,
  enumOperators,
  numberOperators,
  priceOperators,
} from "@/layouts/filters";
import type { IFilterSchema } from "@/layouts/filters/core/types";
import {
  CustomerMarketingState,
  CustomerRiskLevel,
  CustomerStatus,
} from "../graphql/operation-types";

const countryOptions = allowedCountries.map((countryCode) => ({
  value: countryCode,
  label: shopCountries.find((country) => country.value === countryCode)?.name ?? countryCode,
}));

/** Required operational filters for support, sales, and risk workflows. */
export const filterSchema: IFilterSchema[] = [
  {
    key: "status",
    label: "Status",
    description: "Filter by customer account status",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "status",
    options: [
      { label: "Active", value: CustomerStatus.Active },
      { label: "Disabled", value: CustomerStatus.Disabled },
      { label: "Blocked", value: CustomerStatus.Blocked },
    ],
  },
  {
    key: "segment",
    label: "Segment",
    description: "Filter by assigned customer segment",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "segmentId",
    options: [
      { label: "VIP", value: "segment-vip" },
      { label: "Repeat customers", value: "segment-repeat" },
      { label: "New customers", value: "segment-new" },
      { label: "At risk", value: "segment-at-risk" },
      { label: "Wholesale", value: "segment-wholesale" },
    ],
  },
  {
    key: "marketing",
    label: "Email marketing",
    description: "Filter by explicit email consent state",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "emailMarketingState",
    options: [
      { label: "Subscribed", value: CustomerMarketingState.Subscribed },
      { label: "Not subscribed", value: CustomerMarketingState.NotSubscribed },
      { label: "Pending confirmation", value: CustomerMarketingState.Pending },
    ],
  },
  {
    key: "country",
    label: "Country",
    description: "Filter by default-address country",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "countryCode",
    options: countryOptions,
  },
  {
    key: "riskLevel",
    label: "Risk level",
    description: "Filter by operational risk assessment",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "riskLevel",
    options: [
      { label: "Low", value: CustomerRiskLevel.Low },
      { label: "Medium", value: CustomerRiskLevel.Medium },
      { label: "High", value: CustomerRiskLevel.High },
    ],
  },
  {
    key: "ordersCount",
    label: "Orders",
    description: "Filter by completed order count",
    type: FilterType.Integer,
    operators: numberOperators,
    payloadKey: "ordersCount",
  },
  {
    key: "totalSpent",
    label: "Total spent",
    description: "Filter by lifetime spend in the project currency",
    type: FilterType.Price,
    operators: priceOperators,
    payloadKey: "totalSpentMinor",
  },
  {
    key: "complaints",
    label: "Complaints",
    description: "Filter by complaint count",
    type: FilterType.Integer,
    operators: numberOperators,
    payloadKey: "complaintCount",
  },
  {
    key: "lastOrderAt",
    label: "Last order",
    description: "Filter by last-order date",
    type: FilterType.DateRange,
    operators: dateOperators,
    payloadKey: "lastOrderAt",
  },
  {
    key: "createdAt",
    label: "Customer since",
    description: "Filter by profile creation date",
    type: FilterType.DateRange,
    operators: dateOperators,
    payloadKey: "createdAt",
  },
];
