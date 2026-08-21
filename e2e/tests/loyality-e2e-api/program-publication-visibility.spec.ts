/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { decodeGlobalId } from '@utils/globalid';
import {
  createProgram, createVersion, idempotencyKey, publishVersion, seedAccount,
} from '../loyality-admin-api/helpers';
import { LoyaltyE2eTestKit } from './loyalty-e2e-test-kit';

test.describe('Loyalty Admin to Storefront program publication', () => {
  let kit: LoyaltyE2eTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyE2eTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  test('keeps drafts hidden and exposes a published active version', async () => {
    const program = await createProgram(kit.api, { isDefault: true });
    const version = await createVersion(kit.api, program);
    await seedAccount(kit.api, program, { customerId: kit.customer.rawId });
    expect(await kit.loyaltyAccount()).toBeNull();

    const published = await publishVersion(kit.api, version);
    expect(published.status).toBe('ACTIVE');
    expect(await kit.loyaltyAccount('id status')).toMatchObject({ status: 'ACTIVE' });
  });

  test('switches to a scheduled successor only at its effective boundary', async () => {
    const fixture = await kit.createActiveAccount();
    const current = await kit.api.admin.query<any>('loyality-admin-api/Program', {
      variables: { id: fixture.program.id },
    });
    const successor = await createVersion(kit.api, current.data.loyaltyQuery.program, {
      earnPoints: '2', earnAmountMinor: '100',
    });
    const effectiveFrom = new Date(Date.now() + 60_000).toISOString();
    const scheduled = await publishVersion(kit.api, successor, { effectiveFrom });
    expect(scheduled.status).toBe('SCHEDULED');
    const before = await kit.callAction('loyalty.getCustomerLoyaltyAccount', {
      storeId: kit.realm.storeId, customerId: kit.customer.rawId,
      effectiveAt: new Date().toISOString(),
    });
    await kit.api.admin.mutation<any>('loyality-admin-api/MaintenanceRun', {
      variables: { input: {
        effectiveAt: new Date(Date.parse(effectiveFrom) + 1).toISOString(),
        limit: 100,
        idempotencyKey: idempotencyKey('activate-successor'),
      } },
    });
    const after = await kit.callAction('loyalty.getCustomerLoyaltyAccount', {
      storeId: kit.realm.storeId, customerId: kit.customer.rawId,
      effectiveAt: new Date(Date.parse(effectiveFrom) + 1).toISOString(),
    });
    expect(before.account.program.programVersionId).toBeDefined();
    expect(after.account.program.programVersionId).toBeDefined();
    expect(after.account.program.programVersionId)
      .toBe(decodeGlobalId(scheduled.id).id);
    expect(after.account.program.programVersionId)
      .not.toBe(before.account.program.programVersionId);
  });

  test('pauses and archives a program without rewriting historical transactions', async () => {
    const fixture = await kit.fundedAccount('75');
    const before = await kit.transactionCount(fixture.account.id);
    for (const status of ['PAUSED', 'ARCHIVED'] as const) {
      const current = await kit.api.admin.query<any>('loyality-admin-api/Program', {
        variables: { id: fixture.program.id },
      });
      const result = await kit.api.admin.mutation<any>('loyality-admin-api/ProgramUpdate', {
        variables: { input: {
          programId: fixture.program.id,
          
          status,
          idempotencyKey: idempotencyKey(`program-${status}`),
        } },
      });
      expect(result.data.loyaltyMutation.programUpdate.userErrors).toEqual([]);
    }
    expect(await kit.loyaltyAccount()).toBeNull();
    expect(await kit.transactionCount(fixture.account.id)).toBe(before);
  });

  test('does not leak policy JSON through storefront account projections', async () => {
    await kit.createActiveAccount({
      rules: {
        schemaVersion: 1,
        eligibility: { type: 'ALL', channelCodes: ['WEB'], segmentIds: [], excludedSegmentIds: [] },
        earning: { eligibleSpendBasis: 'AFTER_PRODUCT_DISCOUNTS', excludedSelectors: [], modifierStackingMode: 'HIGHEST', modifiers: [] },
      },
    });
    const account = await kit.loyaltyAccount();
    expect(account).not.toBeNull();
    expect(JSON.stringify(account)).not.toMatch(/schemaVersion|eligibleSpendBasis|excludedSelectors/);
  });
});
