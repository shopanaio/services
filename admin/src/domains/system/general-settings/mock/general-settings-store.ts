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
    organizationId: "mock-organization-id",
    name: "demo-store",
    displayName: "Demo store",
    country: "Ukraine",
    timezone: "Europe/Kyiv",
    phoneNumber: "+380 44 000 00 00",
    email: "hello@example.com",
    locales: [LocaleCode.En, LocaleCode.Uk],
    currencies: [CurrencyCode.Usd],
    baseCurrency: CurrencyCode.Usd,
    defaultCurrency: CurrencyCode.Usd,
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

export const updateMockStore = async (input: ApiStoreUpdateInput) => {
  const nextStore = {
    ...snapshot.store,
    ...(input.displayName !== undefined && {
      displayName: input.displayName ?? snapshot.store.displayName,
    }),
    ...(input.email !== undefined && { email: input.email }),
    ...(input.timezone !== undefined && {
      timezone: input.timezone ?? snapshot.store.timezone,
    }),
    ...(input.locales !== undefined && {
      locales: input.locales ?? snapshot.store.locales,
    }),
    ...(input.defaultWeightUnit !== undefined &&
      input.defaultWeightUnit !== null && {
        defaultWeightUnit: input.defaultWeightUnit,
      }),
    ...(input.defaultDimensionUnit !== undefined &&
      input.defaultDimensionUnit !== null && {
        defaultDimensionUnit: input.defaultDimensionUnit,
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
