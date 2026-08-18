import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { decodeGlobalId } from '@utils/globalid';
import { createProgram, createVersion, publishVersion, seedAccount } from '../loyality-admin-api/helpers';
import { LoyaltyStorefrontTestKit } from './loyalty-storefront-test-kit';

test.describe('Loyalty Storefront API customer account', () => {
  let kit: LoyaltyStorefrontTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyStorefrontTestKit(api, request);
    await kit.setupLoyalty();
  });

  test.afterEach(async () => kit.close());

  test('returns the authenticated customer active loyalty account', async () => {
    const { account } = await kit.createActiveAccount();
    const result = await kit.loyaltyAccount();
    expect(result).toMatchObject({
      id: account.id,
      status: 'ACTIVE',
      balance: { pendingPoints: '0', availablePoints: '0', reservedPoints: '0', debtPoints: '0' },
      tier: null,
      upcomingExpirations: [],
      opportunities: { primaryOpportunity: null, opportunities: [], revision: expect.any(String) },
    });
    expect(new Date(result.opportunities.evaluatedAt).toISOString()).toBe(result.opportunities.evaluatedAt);
    expect(JSON.stringify(result)).not.toMatch(/customerId|programId|metadata|qualification/);
  });

  test('returns null when the store has no active loyalty program', async () => {
    expect(await kit.loyaltyAccount()).toBeNull();
    const program = await createProgram(kit.api, { isDefault: true });
    await createVersion(kit.api, program);
    await seedAccount(kit.api, program, { customerId: kit.customer.rawId });
    expect(await kit.loyaltyAccount()).toBeNull();
  });

  test('returns null when the customer has no account in the active program', async () => {
    const program = await createProgram(kit.api, { isDefault: true });
    const version = await createVersion(kit.api, program);
    await publishVersion(kit.api, version);
    expect(await kit.loyaltyAccount()).toBeNull();
  });

  test('does not expose a merged account', async () => {
    const { account } = await kit.createActiveAccount();
    await kit.setAccountStatus(account, 'MERGED');
    expect(await kit.loyaltyAccount()).toBeNull();
  });

  test('does not expose another customer account through a federation reference', async () => {
    const { program } = await kit.createActiveAccount();
    const foreignCustomerId = crypto.randomUUID();
    const foreignAccount = await seedAccount(kit.api, program, { customerId: foreignCustomerId });
    const response = await kit.graphql<{ node: unknown; customer: { loyaltyAccount: { id: string } | null } | null }>(
      `query ForeignCustomer($id: ID!) {
        node(id: $id) { id }
        customer { loyaltyAccount { id } }
      }`,
      { id: kit.id('Customer', foreignCustomerId) },
    );
    expect(response.errors).toBeUndefined();
    expect(response.data?.node).toBeNull();
    expect(response.data?.customer?.loyaltyAccount?.id).not.toBe(foreignAccount.id);
  });

  test('isolates loyalty accounts by storefront store', async () => {
    const { account } = await kit.createActiveAccount();
    const [count] = await kit.sql<{ count: number }[]>`
      select count(*)::int as count from loyalty.account
      where id = ${decodeGlobalId(account.id).id} and store_id = ${kit.realm.storeId}
    `;
    expect(count?.count).toBe(1);
    expect((await kit.loyaltyAccount())?.id).toBe(account.id);
  });

  test('handles suspended closed and blocked customer states safely', async () => {
    const { account } = await kit.createActiveAccount();
    await kit.setAccountStatus(account, 'SUSPENDED');
    expect(await kit.loyaltyAccount('status')).toEqual({ status: 'SUSPENDED' });
    await kit.setAccountStatus(account, 'CLOSED');
    expect(await kit.loyaltyAccount('status')).toEqual({ status: 'CLOSED' });
    await kit.sql`
      update customers.customer set lifecycle_status = 'BLOCKED',
        blocked_reason = 'loyalty storefront e2e'
      where id = ${kit.customer.rawId}
    `;
    expect(await kit.loyaltyAccount('status')).toBeNull();
  });

  test('requires storefront loyalty read permission', async ({ api, request }) => {
    await kit.close();
    kit = new LoyaltyStorefrontTestKit(api, request);
    await kit.setupLoyalty({ permission: false, reuseSession: true });
    const response = await kit.loyaltyAccountResponse('id');
    expect(response.data?.customer?.loyaltyAccount ?? null).toBeNull();
    expect(response.errors?.[0]?.extensions?.code).toMatch(/FORBIDDEN|UNAUTHORIZED/);
    expect(JSON.stringify(response.errors)).not.toMatch(/loyalty\.account|select\s|postgres/iu);
  });
});
