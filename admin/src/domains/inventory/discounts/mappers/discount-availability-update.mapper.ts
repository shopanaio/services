import type {
  ApiDiscount,
  ApiDiscountUpdateInput,
} from "@/graphql/types";
import { DiscountClass, DiscountMethod } from "@/graphql/types";

export interface DiscountAvailabilityFormValues {
  appliesOnOneTimePurchase: boolean;
  appliesOnSubscription: boolean;
  usageLimit: number | null;
  appliesOncePerCustomer: boolean;
  combinesWith: DiscountClass[];
  startsAt: string;
  endsAt: string;
}

function isoToLocalDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function localDateTimeToIso(value: string): string {
  return new Date(value).toISOString();
}

function normalizeCount(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const result = Number(value);
  return Number.isSafeInteger(result) ? result : 0;
}

export function createDiscountAvailabilityFormValues(
  discount: ApiDiscount,
): DiscountAvailabilityFormValues {
  const combinesWith: DiscountClass[] = [];
  if (discount.combinesWithProductDiscounts) {
    combinesWith.push(DiscountClass.Product);
  }
  if (discount.combinesWithOrderDiscounts) {
    combinesWith.push(DiscountClass.Order);
  }
  if (discount.combinesWithShippingDiscounts) {
    combinesWith.push(DiscountClass.Shipping);
  }

  return {
    appliesOnOneTimePurchase: discount.appliesOnOneTimePurchase,
    appliesOnSubscription: discount.appliesOnSubscription,
    usageLimit:
      discount.usageLimit == null ? null : Number(discount.usageLimit),
    appliesOncePerCustomer:
      discount.method === DiscountMethod.Code &&
      discount.appliesOncePerCustomer,
    combinesWith,
    startsAt: isoToLocalDateTime(discount.startsAt),
    endsAt: isoToLocalDateTime(discount.endsAt),
  };
}

export function validateDiscountAvailabilityForm(
  discount: ApiDiscount,
  values: DiscountAvailabilityFormValues,
): string[] {
  const errors: string[] = [];

  if (
    !values.appliesOnOneTimePurchase &&
    !values.appliesOnSubscription
  ) {
    errors.push("Select at least one purchase mode.");
  }
  if (
    values.usageLimit != null &&
    (!Number.isSafeInteger(values.usageLimit) || values.usageLimit < 1)
  ) {
    errors.push("Usage limit must be a positive whole number.");
  }
  const minimumUsageLimit =
    normalizeCount(discount.reservedUsageCount) +
    normalizeCount(discount.usageCount);
  if (
    values.usageLimit != null &&
    values.usageLimit < minimumUsageLimit
  ) {
    errors.push(
      `Usage limit cannot be below ${minimumUsageLimit} reserved and consumed uses.`,
    );
  }
  if (!values.startsAt || Number.isNaN(new Date(values.startsAt).getTime())) {
    errors.push("Start date is required.");
  }
  if (
    values.endsAt &&
    (Number.isNaN(new Date(values.endsAt).getTime()) ||
      new Date(values.endsAt) <= new Date(values.startsAt))
  ) {
    errors.push("End date must be after the start date.");
  }

  return errors;
}

export function buildDiscountAvailabilityUpdateInput(
  discount: ApiDiscount,
  values: DiscountAvailabilityFormValues,
): ApiDiscountUpdateInput {
  return {
    definition: {
      purchaseModes: {
        appliesOnOneTimePurchase: values.appliesOnOneTimePurchase,
        appliesOnSubscription: values.appliesOnSubscription,
      },
      usage: {
        usageLimit: values.usageLimit,
        appliesOncePerCustomer:
          discount.method === DiscountMethod.Code
            ? values.appliesOncePerCustomer
            : false,
      },
      schedule: {
        startsAt: localDateTimeToIso(values.startsAt),
        endsAt: values.endsAt
          ? localDateTimeToIso(values.endsAt)
          : null,
      },
    },
    combinesWith: values.combinesWith,
  };
}
