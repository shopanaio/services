import type { ApiStore, ApiStoreUpdateInput } from "@/graphql/types";
import type {
  StoreDefaultsFormValues,
  StoreSettingsFormValues,
  StoreSettingsSection,
} from "../types";

const optionalValue = (value: string) => value.trim() || null;

export const normalizeStorePhoneNumber = (value: string) =>
  value.trim().replace(/[\s()-]/g, "");

export const mapStoreSettingsInput = (
  section: StoreSettingsSection,
  values: StoreSettingsFormValues,
  store: ApiStore,
): ApiStoreUpdateInput => {
  if (section === "contact") {
    return {
      contactDetails: {
        name: values.name.trim(),
        slug: values.slug.trim(),
        email: optionalValue(values.email),
        phoneNumbers: values.phoneNumbers
          .map(({ value }) => normalizeStorePhoneNumber(value))
          .filter(Boolean),
      },
    };
  }

  if (section === "address") {
    return {
      address: {
        companyName: optionalValue(values.companyName),
        countryCode: values.countryCode,
        addressLine1: optionalValue(values.addressLine1),
        addressLine2: optionalValue(values.addressLine2),
        city: optionalValue(values.city),
        administrativeArea:
          optionalValue(values.administrativeArea) ??
          store.address?.administrativeArea ??
          null,
        postalCode: optionalValue(values.postalCode),
      },
    };
  }

  return {
    brand: {
      defaultLogoId: values.defaultLogoId,
      squareLogoId: values.squareLogoId,
      coverImageId: values.coverImageId,
      primaryColor: values.primaryColor,
      secondaryColor: values.secondaryColor,
      slogan: optionalValue(values.slogan),
      shortDescription: optionalValue(values.shortDescription),
      socialLinks: values.socialLinks
        .map(({ platform, url }) => ({
          platform: platform.trim(),
          url: url.trim(),
        }))
        .filter(({ platform, url }) => platform && url),
    },
  };
};

export const mapStoreDefaultsInput = (
  values: StoreDefaultsFormValues,
  store: ApiStore,
): ApiStoreUpdateInput => ({
  defaults: {
    unitSystem: values.unitSystem,
    defaultWeightUnit: values.defaultWeightUnit,
    defaultDimensionUnit: store.defaults.defaultDimensionUnit,
    timezone: values.timezone,
  },
});
