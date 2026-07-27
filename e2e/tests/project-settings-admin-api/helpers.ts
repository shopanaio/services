import type { ApiFixtures } from '@fixtures/api/api';
import { expect } from '@playwright/test';
import { decodeGlobalId } from '@utils/globalid';
import postgres from 'postgres';

export type Api = ApiFixtures['api'];
export type Sql = ReturnType<typeof postgres>;

export function openSql(): Sql {
  return postgres(
    process.env.E2E_DATABASE_URL ??
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:15432/portal',
    { max: 1 },
  );
}

export interface UserError {
  code?: string | null;
  message: string;
  field?: string[] | null;
}

export interface StoreView {
  id: string;
  revision: number;
  name: string;
  displayName: string;
  status: string;
  timezone: string;
  email?: string | null;
  locales: string[];
  defaultLocale: string;
  currencyCode: string;
  defaultWeightUnit: string;
  defaultDimensionUnit: string;
  organization?: { id: string } | null;
  membership?: { domain: string; organizationId: string } | null;
  languageSettings: { code: string; name: string; isActive: boolean }[];
  contactDetails: {
    name: string;
    slug: string;
    email?: string | null;
    phoneNumbers: string[];
  };
  address?: {
    companyName?: string | null;
    countryCode: string;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    administrativeArea?: string | null;
    postalCode?: string | null;
  } | null;
  brand: {
    defaultLogo?: { id: string } | null;
    squareLogo?: { id: string } | null;
    coverImage?: { id: string } | null;
    primaryColor: string;
    secondaryColor: string;
    slogan?: string | null;
    shortDescription?: string | null;
    socialLinks: { platform: string; url: string }[];
  };
  orderProcessing: {
    orderNumberPrefix: string;
    orderNumberSuffix?: string | null;
    requireCheckoutConfirmation: boolean;
    automaticFulfillmentMode: string;
    automaticallyArchiveOrders: boolean;
  };
  defaults: {
    unitSystem: string;
    defaultWeightUnit: string;
    defaultDimensionUnit: string;
    timezone: string;
  };
  currencySettings: {
    currencyCode: string;
    currencyDisplay: string;
    currencySign: string;
    grouping: string;
    signDisplay: string;
    minimumFractionDigits: number;
    maximumFractionDigits: number;
    roundingMode: string;
    trailingZeroDisplay: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePayload {
  store: StoreView | null;
  operationResults: {
    type: string;
    applied: boolean;
    errors: UserError[];
  }[];
  userErrors: UserError[];
}

interface UpdateOptions {
  clientMutationId?: string;
  expectedRevision?: number;
  storeId?: string;
}

export const validContact = (name: string, slug: string) => ({
  name,
  slug,
  email: 'settings@playwright.dev',
  phoneNumbers: ['+12025550101', '+442071838750'],
});

export const validAddress = {
  companyName: 'Shopana E2E',
  countryCode: 'UA',
  addressLine1: '1 Test Street',
  addressLine2: 'Suite 2',
  city: 'Kyiv',
  administrativeArea: 'Kyiv',
  postalCode: '01001',
};

export const validBrand = {
  defaultLogoId: null,
  squareLogoId: null,
  coverImageId: null,
  primaryColor: '#112233',
  secondaryColor: '#AABBCC',
  slogan: 'Settings made clear',
  shortDescription: 'Project settings contract fixture',
  socialLinks: [
    { platform: 'github', url: 'https://github.com/shopana' },
    { platform: 'x', url: 'https://x.com/shopana' },
  ],
};

export const validOrderProcessing = {
  orderNumberPrefix: 'WEB-',
  orderNumberSuffix: '-UA',
  requireCheckoutConfirmation: false,
  automaticFulfillmentMode: 'ALL_LINE_ITEMS',
  automaticallyArchiveOrders: false,
};

export const validDefaults = {
  unitSystem: 'METRIC',
  defaultWeightUnit: 'kg',
  defaultDimensionUnit: 'cm',
  timezone: 'Europe/Kyiv',
};

export const validCurrencySettings = {
  currencyCode: 'EUR',
  currencyDisplay: 'CODE',
  currencySign: 'ACCOUNTING',
  grouping: 'ALWAYS',
  signDisplay: 'EXCEPT_ZERO',
  minimumFractionDigits: 1,
  maximumFractionDigits: 3,
  roundingMode: 'HALF_EVEN',
  trailingZeroDisplay: 'STRIP_IF_INTEGER',
};

export async function setupStore(api: Api, overrides: Record<string, unknown> = {}) {
  await api.session.setupUserAndStore(overrides);
  return currentStore(api);
}

export async function currentStore(api: Api): Promise<StoreView> {
  const { data } = await api.admin.query('project-api/Project', {});
  const store = data.storeQuery.currentStore as unknown as StoreView | null;
  expect(store).not.toBeNull();
  return required(store, 'current store');
}

export async function maybeCurrentStore(api: Api): Promise<StoreView | null> {
  const { data } = await api.admin.query('project-api/Project', {
    throwOnError: false,
  });
  return data?.storeQuery?.currentStore as unknown as StoreView | null;
}

export async function updateStore(
  api: Api,
  store: Pick<StoreView, 'id' | 'revision'>,
  operations: Record<string, unknown> | null,
  options: UpdateOptions = {},
): Promise<UpdatePayload> {
  const { payload, errors } = await requestStoreUpdate(api, store, operations, options);
  if (!payload) {
    throw new Error(`storeUpdate returned no payload: ${JSON.stringify(errors)}`);
  }
  return payload;
}

export async function requestStoreUpdate(
  api: Api,
  store: Pick<StoreView, 'id' | 'revision'>,
  operations: Record<string, unknown> | null,
  options: UpdateOptions = {},
) {
  const { data, errors } = await api.admin.mutation('project-api/ProjectUpdate', {
    throwOnError: false,
    variables: {
      storeId: options.storeId ?? store.id,
      clientMutationId: options.clientMutationId ?? `settings-${crypto.randomUUID()}`,
      expectedRevision: options.expectedRevision ?? store.revision,
      operations,
    },
  });
  return {
    payload: data?.storeMutation?.storeUpdate as unknown as UpdatePayload | undefined,
    errors,
  };
}

export async function createStore(
  api: Api,
  organizationId: string,
  overrides: Record<string, unknown> = {},
) {
  const name = `settings-${crypto.randomUUID().slice(0, 12)}`;
  const { data } = await api.admin.mutation('project-api/ProjectCreate', {
    throwOnError: false,
    variables: {
      input: {
        organizationId,
        name,
        displayName: 'Project Settings E2E',
        locales: ['en'],
        currencyCode: 'USD',
        ...overrides,
      },
    },
  });
  return data.storeMutation.storeCreate;
}

export async function localeCreate(api: Api, code: string, isActive: boolean) {
  const { data, errors } = await api.admin.mutation('project-api/LocaleCreate', {
    throwOnError: false,
    variables: { input: { code, isActive } },
  });
  return { payload: data?.storeMutation?.localeCreate, errors };
}

export async function localeDelete(api: Api, code: string) {
  const { data, errors } = await api.admin.mutation('project-api/LocaleDelete', {
    throwOnError: false,
    variables: { input: { code } },
  });
  return { payload: data?.storeMutation?.localeDelete, errors };
}

export async function localeSetDefault(api: Api, locale: string) {
  const { data, errors } = await api.admin.mutation('project-api/LocaleSetDefault', {
    throwOnError: false,
    variables: { input: { locale } },
  });
  return { payload: data?.storeMutation?.localeSetDefault, errors };
}

export function selectStore(api: Api, store: Pick<StoreView, 'id' | 'name' | 'displayName'>) {
  api.session.project = store;
}

export function expectSuccess(payload: UpdatePayload, operationTypes?: string[]) {
  expect(payload.userErrors).toHaveLength(0);
  expect(payload.store).not.toBeNull();
  expect(payload.operationResults.every(({ applied }) => applied)).toBe(true);
  expect(payload.operationResults.every(({ errors }) => errors.length === 0)).toBe(true);
  if (operationTypes) {
    expect(payload.operationResults.map(({ type }) => type)).toEqual(operationTypes);
  }
}

export function expectError(
  errors: UserError[],
  expected: { code?: string; field?: string[] },
) {
  expect(errors.length).toBeGreaterThan(0);
  if (expected.code) expect(errors.map(({ code }) => code)).toContain(expected.code);
  if (expected.field) expect(errors.map(({ field }) => field)).toContainEqual(expected.field);
}

export function rawId(globalId: string) {
  return decodeGlobalId(globalId).id;
}

export function required<T>(value: T | null | undefined, label: string): T {
  if (value == null) throw new Error(`Missing ${label}`);
  return value;
}

export function stableSettings(store: StoreView) {
  return {
    contactDetails: store.contactDetails,
    address: store.address,
    brand: store.brand,
    orderProcessing: store.orderProcessing,
    defaults: store.defaults,
    currencySettings: store.currencySettings,
    locales: store.locales,
    defaultLocale: store.defaultLocale,
  };
}
