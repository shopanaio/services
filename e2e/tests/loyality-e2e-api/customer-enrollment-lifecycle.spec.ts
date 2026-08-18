import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { decodeGlobalId } from '@utils/globalid';
import { LoyaltyE2eTestKit } from './loyalty-e2e-test-kit';

test.describe('Loyalty customer lifecycle across Admin and Storefront', () => {
  let kit: LoyaltyE2eTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyE2eTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  test('exposes one active account consistently through Admin, broker and Storefront', async () => {
    const fixture = await kit.createActiveAccount();
    const broker = await kit.callAction('loyalty.getCustomerLoyaltyAccount', {
      storeId: kit.realm.storeId, customerId: kit.customer.rawId,
      effectiveAt: new Date().toISOString(),
    });
    expect(broker).toMatchObject({ found: true, account: { status: 'ACTIVE' } });
    expect(await kit.loyaltyAccount('id status')).toEqual({
      id: fixture.account.id, status: 'ACTIVE',
    });
  });

  test('suspends reactivates and closes without deleting immutable history', async () => {
    const fixture = await kit.fundedAccount('25');
    const historyCount = await kit.transactionCount(fixture.account.id);
    await kit.setAccountStatus(fixture.account, 'SUSPENDED');
    expect(await kit.loyaltyAccount('status')).toEqual({ status: 'SUSPENDED' });
    await kit.setAccountStatus(fixture.account, 'ACTIVE');
    expect(await kit.loyaltyAccount('status')).toEqual({ status: 'ACTIVE' });
    await kit.setAccountStatus(fixture.account, 'CLOSED');
    expect(await kit.loyaltyAccount('status')).toEqual({ status: 'CLOSED' });
    expect(await kit.transactionCount(fixture.account.id)).toBe(historyCount);
  });

  test('hides merged and deleted customer ownership while retaining audit rows', async () => {
    const merged = await kit.fundedAccount('40');
    await kit.setAccountStatus(merged.account, 'MERGED');
    expect(await kit.loyaltyAccount()).toBeNull();
    expect(await kit.transactionCount(merged.account.id)).toBe(1);

    const deleted = await kit.fundedAccount('30');
    await kit.sql.begin(async (sql) => {
      await sql`
        update loyalty.account set status = 'CLOSED', closed_at = now(), revision = revision + 1
        where id = ${decodeGlobalId(deleted.account.id).id}
      `;
      await sql`
        update customers.customer set lifecycle_status = 'BLOCKED',
          blocked_reason = 'deleted customer e2e', blocked_at = now()
        where id = ${kit.customer.rawId}
      `;
    });
    expect(await kit.loyaltyAccount()).toBeNull();
    expect(await kit.transactionCount(deleted.account.id)).toBe(1);
  });
});
