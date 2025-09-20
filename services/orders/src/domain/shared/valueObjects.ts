// Value Objects and validators for domain invariants

import { DeliveryMethodType, ShippingPaymentModel } from "@shopana/shipping-plugin-sdk";
import { Money } from "@shopana/shared-money";

export type CurrencyCode = string & { readonly __brand: "CurrencyCode" };
export type SalesChannel = string & { readonly __brand: "SalesChannel" };
export type IdempotencyKey = string & { readonly __brand: "IdempotencyKey" };
export type FxRate = number & { readonly __brand: "FxRate" };

export type ShippingCost = {
  amount: Money;
  paymentModel: ShippingPaymentModel;
};

export type DeliveryMethod = {
  id: string;
  deliveryMethodType: DeliveryMethodType;
  providerId: string;
  name: string;
  description?: string | null;
  estimatedDeliveryDays?: number | null;
  shippingCost?: ShippingCost | null;
};

export type Address = {
  id: string;
  address1: string;
  address2?: string | null;
  city: string;
  countryCode: string;
  provinceCode?: string | null;
  postalCode?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
};

export function assertCurrencyCode(
  value: string | null | undefined
): asserts value is CurrencyCode {
  if (!value || !/^[A-Z]{3}$/.test(value)) {
    throw new Error(
      "Invalid currency code: must be ISO-4217, 3 uppercase letters"
    );
  }
}

export function assertOptionalCurrencyCode(
  value: string | null | undefined
): asserts value is CurrencyCode | null | undefined {
  if (value == null) return;
  assertCurrencyCode(value);
}

export function normalizeCurrencyCode(value: string): CurrencyCode {
  const upper = value.toUpperCase();
  assertCurrencyCode(upper);
  return upper as CurrencyCode;
}

export function assertFxRatePositive(
  value: number | null | undefined
): asserts value is FxRate {
  if (value == null || !(value > 0)) {
    throw new Error("Invalid FX rate: must be a positive number");
  }
}

export function assertIdempotencyKey(
  value: string | null | undefined
): asserts value is IdempotencyKey {
  if (!value || typeof value !== "string") {
    throw new Error("Invalid idempotencyKey: required");
  }
  // keep conservative upper bound to avoid oversized keys in storage/indexes
  if (value.length > 128) {
    throw new Error("Invalid idempotencyKey: too long");
  }
}

export function normalizeSalesChannel(
  value: string | null | undefined,
  fallback: string = "web"
): SalesChannel {
  const candidate = (value ?? fallback).trim();
  if (candidate.length === 0) {
    throw new Error("Invalid salesChannel: empty");
  }
  return candidate as SalesChannel;
}

export const vo: {
  assertCurrencyCode: (
    value: string | null | undefined
  ) => asserts value is CurrencyCode;
  assertOptionalCurrencyCode: (
    value: string | null | undefined
  ) => asserts value is CurrencyCode | null | undefined;
  normalizeCurrencyCode: (value: string) => CurrencyCode;
  assertFxRatePositive: (
    value: number | null | undefined
  ) => asserts value is FxRate;
  assertIdempotencyKey: (
    value: string | null | undefined
  ) => asserts value is IdempotencyKey;
  normalizeSalesChannel: (
    value: string | null | undefined,
    fallback?: string
  ) => SalesChannel;
} = {
  assertCurrencyCode,
  assertOptionalCurrencyCode,
  normalizeCurrencyCode,
  assertFxRatePositive,
  assertIdempotencyKey,
  normalizeSalesChannel,
};
