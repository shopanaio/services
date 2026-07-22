import {
  type ApiLocaleCreateInput,
  type ApiLocaleDeleteInput,
  type ApiLocaleSetDefaultInput,
  type ApiStoreDeleteInput,
  type ApiStoreUpdateInput,
  CurrencyCode,
  DimensionUnit,
  LocaleCode,
  WeightUnit,
} from "@/graphql/types";
import { shopLocalesRecord } from "@/defs/localization";
import type { GeneralSettingsSnapshot } from "../types";

const MOCK_REQUEST_DELAY = 250;

let snapshot: GeneralSettingsSnapshot = {
  store: {
    id: "mock-store-id",
    revision: 0,
    organizationId: "mock-organization-id",
    name: "demo-store",
    displayName: "Demo store",
    country: "Ukraine",
    timezone: "Europe/Kyiv",
    phoneNumber: "+380 44 000 00 00",
    email: "hello@example.com",
    locales: [LocaleCode.En, LocaleCode.Uk],
    currencyCode: CurrencyCode.Usd,
    defaultLocale: LocaleCode.En,
    defaultWeightUnit: WeightUnit.Kg,
    defaultDimensionUnit: DimensionUnit.Cm,
  },
  locales: [
    {
      code: LocaleCode.En,
      name: "English",
      isActive: true,
    },
    {
      code: LocaleCode.Uk,
      name: "Ukrainian",
      isActive: true,
    },
  ],
};

const listeners = new Set<() => void>();

const publish = (nextSnapshot: GeneralSettingsSnapshot) => {
  snapshot = nextSnapshot;
  listeners.forEach((listener) => listener());
};

const mockRequest = async <TData>(data: TData): Promise<TData> => {
  await new Promise((resolve) => setTimeout(resolve, MOCK_REQUEST_DELAY));
  return data;
};

export const subscribeToGeneralSettings = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getGeneralSettingsSnapshot = () => snapshot;

export const updateMockStore = async (input: {
  expectedRevision: number;
  operations: ApiStoreUpdateInput;
}) => {
  if (input.expectedRevision !== snapshot.store.revision) {
    throw new Error("Store was modified by another user");
  }
  const operations = input.operations;
  const contactDetails = operations.contactDetails;
  const defaults = operations.defaults;
  const currencySettings = operations.currencySettings;
  const nextStore = {
    ...snapshot.store,
    revision: snapshot.store.revision + 1,
    ...(contactDetails && {
      displayName: contactDetails.name,
      name: contactDetails.slug,
      email: contactDetails.email ?? null,
      phoneNumber: contactDetails.phoneNumbers[0] ?? null,
    }),
    ...(defaults && {
      timezone: defaults.timezone,
      defaultWeightUnit: defaults.defaultWeightUnit,
      defaultDimensionUnit: defaults.defaultDimensionUnit,
    }),
    ...(currencySettings && {
      currencyCode: currencySettings.currencyCode,
      defaultLocale: currencySettings.locale,
    }),
  };

  publish({ ...snapshot, store: nextStore });
  return mockRequest(nextStore);
};

export const addMockLocale = async ({
  code,
  isActive,
}: ApiLocaleCreateInput) => {
  const locale = {
    code,
    name: shopLocalesRecord[code]?.name ?? code,
    isActive,
  };
  publish({
    store: {
      ...snapshot.store,
      locales: [...snapshot.store.locales, code],
    },
    locales: [...snapshot.locales, locale],
  });
  return mockRequest(locale);
};

export const deleteMockLocale = async ({ code }: ApiLocaleDeleteInput) => {
  publish({
    store: {
      ...snapshot.store,
      locales: snapshot.store.locales.filter((locale) => locale !== code),
    },
    locales: snapshot.locales.filter((locale) => locale.code !== code),
  });
  return mockRequest(code);
};

export const setMockDefaultLocale = async ({
  locale,
}: ApiLocaleSetDefaultInput) => {
  publish({
    ...snapshot,
    store: { ...snapshot.store, defaultLocale: locale },
  });
  return mockRequest(true);
};

export const deleteMockStore = async ({ id }: ApiStoreDeleteInput) =>
  mockRequest(id);
