export type StoreSettingsSection = "contact" | "address" | "brand";

export interface StoreSettingsFormValues {
  name: string;
  slug: string;
  email: string;
  phoneNumbers: Array<{ value: string }>;
  companyName: string;
  countryCode: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  administrativeArea: string;
  postalCode: string;
  primaryColor: string;
  secondaryColor: string;
  slogan: string;
  shortDescription: string;
  socialLinks: Array<{ platform: string; url: string }>;
  defaultLogoId: string | null;
  defaultLogoUrl: string | null;
  squareLogoId: string | null;
  squareLogoUrl: string | null;
  coverImageId: string | null;
  coverImageUrl: string | null;
}

export interface StoreDefaultsFormValues {
  unitSystem: import("@/graphql/types").UnitSystem;
  defaultWeightUnit: import("@/graphql/types").WeightUnit;
  timezone: string;
}

export interface StoreCurrencyFormValues {
  currencyCode: import("@/graphql/types").CurrencyCode;
  currencyDisplay: import("@/graphql/types").CurrencyDisplay;
  currencySign: import("@/graphql/types").CurrencySign;
  grouping: import("@/graphql/types").CurrencyGrouping;
  signDisplay: import("@/graphql/types").CurrencySignDisplay;
  minimumFractionDigits: number;
  maximumFractionDigits: number;
  roundingMode: import("@/graphql/types").CurrencyRoundingMode;
  trailingZeroDisplay: import("@/graphql/types").CurrencyTrailingZeroDisplay;
}
