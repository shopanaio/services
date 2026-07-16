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
  CustomerLifecycleStatus,
  CustomerConsentState,
} from "@/graphql/types";

const countryOptions = allowedCountries.map((countryCode) => ({
  value: countryCode,
  label: shopCountries.find((country) => country.value === countryCode)?.name ?? countryCode,
}));

/** Required operational filters for support and sales workflows. */
export const filterSchema: IFilterSchema[] = [
  {
    key: "status",
    label: "Status",
    description: "Filter by customer account status",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "lifecycleStatus",
    options: [
      { label: "Active", value: CustomerLifecycleStatus.Active },
      { label: "Disabled", value: CustomerLifecycleStatus.Disabled },
      { label: "Blocked", value: CustomerLifecycleStatus.Blocked },
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
      { label: "Subscribed", value: CustomerConsentState.Subscribed },
      { label: "Not subscribed", value: CustomerConsentState.NotSubscribed },
      { label: "Pending confirmation", value: CustomerConsentState.Pending },
      { label: "Unsubscribed", value: CustomerConsentState.Unsubscribed },
    ],
  },
  {
    key: "country",
    label: "Country",
    description: "Filter by default-address country",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "defaultShippingCountryCode",
    options: countryOptions,
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

export function createCustomerFilterSchema(
  segments: Array<{ id: string; name: string }>,
): IFilterSchema[] {
  if (segments.length === 0) return filterSchema;

  return [
    filterSchema[0]!,
    {
      key: "segment",
      label: "Segment",
      description: "Filter by assigned customer segment",
      type: FilterType.Enum,
      operators: enumOperators,
      payloadKey: "segmentId",
      options: segments.map((segment) => ({ label: segment.name, value: segment.id })),
    },
    ...filterSchema.slice(1),
  ];
}
