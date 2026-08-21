/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ApiFixtures } from '@fixtures/api/api';
import { expect } from '@playwright/test';
import { composeGlobalId, decodeGlobalId } from '@utils/globalid';
import postgres from 'postgres';

export type Api = ApiFixtures['api'];
export type Json = Record<string, any>;

const DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:15432/portal';

export const unique = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 12)}`;
export const idempotencyKey = (prefix: string) => `${prefix}:${crypto.randomUUID()}`;
export const future = (minutes = 10) => new Date(Date.now() + minutes * 60_000).toISOString();
export const past = (minutes = 10) => new Date(Date.now() - minutes * 60_000).toISOString();

export function baseRules(overrides: Json = {}): Json {
  return {
    schemaVersion: 1,
    eligibility: {
      type: 'ALL',
      channelCodes: ['ADMIN', 'WEB'],
      segmentIds: [],
      excludedSegmentIds: [],
      ...(overrides.eligibility ?? {}),
    },
    earning: {
      eligibleSpendBasis: 'AFTER_PRODUCT_DISCOUNTS',
      excludedSelectors: [],
      modifierStackingMode: 'HIGHEST',
      modifiers: [],
      ...(overrides.earning ?? {}),
    },
    ...Object.fromEntries(
      Object.entries(overrides).filter(([key]) => !['eligibility', 'earning'].includes(key)),
    ),
  };
}

export function versionInput(program: Json, overrides: Json = {}): Json {
  return {
    programId: program.id,
    expectedProgramRevision: program.revision,
    earningEnabled: true,
    redemptionEnabled: true,
    activationDelaySeconds: 0,
    earnPoints: '1',
    earnAmountMinor: '100',
    minimumEligibleAmountMinor: '0',
    redeemPoints: '100',
    redeemAmountMinor: '100',
    minimumRedeemPoints: '1',
    maximumOrderPercentageBps: 10_000,
    roundingMode: 'DOWN',
    refundPolicy: 'PROPORTIONAL',
    debtPolicy: 'TRACK_DEBT',
    restoredPointsExpiryPolicy: 'ORIGINAL_EXPIRY',
    rules: baseRules(),
    earningRules: [],
    rewardDefinitions: [],
    idempotencyKey: idempotencyKey('version-create'),
    ...overrides,
  };
}

export async function setupStore(api: Api) {
  await api.session.setupUserAndStore({ currencyCode: 'USD' });
}

export async function requestProgramCreate(api: Api, input: Json) {
  const { data, errors } = await api.admin.mutation<Json>('loyality-admin-api/ProgramCreate', {
    throwOnError: false,
    variables: { input },
  });
  return { payload: data?.loyaltyMutation?.programCreate, errors };
}

export async function createProgram(api: Api, overrides: Json = {}): Promise<Json> {
  const { payload, errors } = await requestProgramCreate(api, {
    code: unique('program'),
    name: 'Playwright Loyalty',
    defaultCurrencyCode: 'USD',
    isDefault: false,
    metadata: { source: 'e2e' },
    idempotencyKey: idempotencyKey('program-create'),
    ...overrides,
  });
  expect(errors ?? []).toHaveLength(0);
  expectNoUserErrors(payload);
  return required(payload.program, 'created loyalty program');
}

export async function requestVersionCreate(api: Api, input: Json) {
  const { data, errors } = await api.admin.mutation<Json>(
    'loyality-admin-api/ProgramVersionCreate',
    { throwOnError: false, variables: { input } },
  );
  return { payload: data?.loyaltyMutation?.programVersionCreate, errors };
}

export async function createVersion(api: Api, program: Json, overrides: Json = {}): Promise<Json> {
  const { payload, errors } = await requestVersionCreate(api, versionInput(program, overrides));
  expect(errors ?? []).toHaveLength(0);
  expectNoUserErrors(payload);
  return required(payload.programVersion, 'created loyalty program version');
}

export async function publishVersion(api: Api, version: Json, overrides: Json = {}): Promise<Json> {
  const { data, errors } = await api.admin.mutation<Json>(
    'loyality-admin-api/ProgramVersionPublish',
    {
      throwOnError: false,
      variables: {
        input: {
          programVersionId: version.id,
          
          effectiveFrom: past(1),
          idempotencyKey: idempotencyKey('version-publish'),
          ...overrides,
        },
      },
    },
  );
  const payload = data?.loyaltyMutation?.programVersionPublish;
  expect(errors ?? []).toHaveLength(0);
  expectNoUserErrors(payload);
  return required(payload.programVersion, 'published loyalty program version');
}

export async function createDraft(api: Api, programOverrides: Json = {}, versionOverrides: Json = {}) {
  const program = await createProgram(api, programOverrides);
  const version = await createVersion(api, program, versionOverrides);
  return { program, version };
}

export async function seedAccount(api: Api, program: Json, overrides: Json = {}): Promise<Json> {
  const sql = postgres(DATABASE_URL, { max: 1 });
  const accountId = crypto.randomUUID();
  const customerId = overrides.customerId ?? crypto.randomUUID();
  const storeId = decodeGlobalId(api.session.project.id).id;
  const programId = decodeGlobalId(program.id).id;
  try {
    await sql.begin(async (transaction) => {
      await transaction`
        INSERT INTO loyalty.account (id, store_id, program_id, customer_id, status, revision)
        VALUES (${accountId}, ${storeId}, ${programId}, ${customerId}, ${overrides.status ?? 'ACTIVE'}, 1)
      `;
      await transaction`
        INSERT INTO loyalty.account_balance (account_id, store_id)
        VALUES (${accountId}, ${storeId})
      `;
    });
  } finally {
    await sql.end();
  }
  return {
    id: composeGlobalId('LoyaltyAccount', accountId),
    customerId: composeGlobalId('Customer', customerId),
    status: overrides.status ?? 'ACTIVE',
    revision: 1,
    balanceRevision: 1,
  };
}

export async function getCustomerAccount(api: Api, customerId: string, programId?: string) {
  const { data, errors } = await api.admin.query<Json>('loyality-admin-api/CustomerAccount', {
    throwOnError: false,
    variables: { customerId, ...(programId ? { programId } : {}) },
  });
  expect(errors ?? []).toHaveLength(0);
  return data?.loyaltyQuery?.customerAccount ?? null;
}

export function expectNoUserErrors(payload: Json | undefined) {
  const value = required(payload, 'GraphQL mutation payload');
  expect(value.userErrors).toEqual([]);
}

export function expectUserError(payload: Json | undefined, code?: string) {
  const value = required(payload, 'GraphQL mutation payload');
  expect(value.userErrors.length).toBeGreaterThan(0);
  if (code) expect(value.userErrors).toEqual(expect.arrayContaining([expect.objectContaining({ code })]));
}

export function required<T>(value: T | null | undefined, label: string): T {
  if (value == null) throw new Error(`Missing ${label}`);
  return value;
}

export function rawId(id: string): string {
  return decodeGlobalId(id).id;
}
