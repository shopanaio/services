import { shopCountries, shopLocales } from "@/defs/localization";
import { formatDetailDate } from "@/domains/inventory/utils/format-detail-date";
import { CustomerTaxExemptionStatus, CustomerTaxIdentifierStatus } from "@/graphql/types";

export const customerTaxIdentifierStatusColor: Partial<
  Record<CustomerTaxIdentifierStatus, string>
> = {
  [CustomerTaxIdentifierStatus.Verified]: "green",
  [CustomerTaxIdentifierStatus.Unverified]: "gold",
  [CustomerTaxIdentifierStatus.Rejected]: "red",
  [CustomerTaxIdentifierStatus.Expired]: "default",
};

export const customerTaxExemptionStatusColor: Partial<Record<CustomerTaxExemptionStatus, string>> =
  {
    [CustomerTaxExemptionStatus.Active]: "green",
    [CustomerTaxExemptionStatus.Revoked]: "red",
    [CustomerTaxExemptionStatus.Expired]: "default",
  };

export function compactParts(parts: Array<string | null | undefined>, separator = " · ") {
  return parts.filter((part): part is string => Boolean(part?.trim())).join(separator);
}

export function enumLabel(value?: string | null) {
  if (!value) return "";
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

export function formatCustomerDate(value?: string | null) {
  return value ? formatDetailDate(value) : "—";
}

export function formatCustomerDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatCustomerMoney(value: unknown, currency: string | null) {
  if (value === null || value === undefined || !currency) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).format(Number(value) / 100);
}

export function formatCustomerSource(value?: string | null) {
  return enumLabel(value);
}

export function formatLocale(value?: string | null) {
  if (!value) return null;
  const locale = shopLocales.find((item) => item.value === value);
  return locale ? `${locale.name} (${locale.value})` : value;
}

export function formatCountry(value?: string | null) {
  if (!value) return null;
  const country = shopCountries.find((item) => item.value === value);
  return country ? `${country.name} (${country.value})` : value;
}

export function customerInitials(firstName?: string | null, lastName?: string | null) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
}

export function shortCustomerId(value: string) {
  const localId = value.split("/").at(-1) ?? value;
  return localId.length > 8 ? `${localId.slice(0, 8)}…` : localId;
}
