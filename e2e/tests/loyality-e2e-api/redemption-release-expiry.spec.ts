/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { idempotencyKey } from '../loyality-admin-api/helpers';
import { LoyaltyE2eTestKit } from './loyalty-e2e-test-kit';

test.describe('Loyalty redemption release and expiry end to end', () => {
  let kit: LoyaltyE2eTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyE2eTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  test('releases reserved points and restores the available balance', async () => {
    const { fixture, context, reservation } = await kit.quotedReservation('300');
    expect(await kit.release(context, reservation, { reason: 'ORDER_FAILED' })).toMatchObject({
      status: 'RELEASED', points: '300',
    });
    expect(await kit.accountBalance(fixture.account.id)).toMatchObject({
      availablePoints: '1000', reservedPoints: '0',
    });
    expect(await kit.transactionCount(fixture.account.id, ['RESERVE', 'RELEASE'])).toBe(2);
  });

  test('expires an abandoned reservation at the verified quote expiry', async () => {
    const { fixture, quote } = await kit.quotedReservation('125');
    const result = await kit.callAction('loyalty.expireCheckoutLoyaltyRedemptions', {
      storeId: kit.realm.storeId,
      effectiveAt: new Date(Date.parse(quote.expiresAt) + 1).toISOString(),
      limit: 100,
    });
    expect(result.expired).toHaveLength(1);
    expect(await kit.accountBalance(fixture.account.id)).toMatchObject({
      availablePoints: '1000', reservedPoints: '0',
    });
  });

  test('does not release or expire a committed reservation', async () => {
    const { fixture, context, quote, reservation } = await kit.quotedReservation('100');
    expect(await kit.commit(context, quote, reservation)).toMatchObject({ status: 'COMMITTED' });
    expect(await kit.release(context, reservation)).toMatchObject({
      status: 'REJECTED', code: 'RESERVATION_COMMITTED',
    });
    await kit.callAction('loyalty.expireCheckoutLoyaltyRedemptions', {
      storeId: kit.realm.storeId,
      effectiveAt: new Date(Date.parse(quote.expiresAt) + 1).toISOString(),
      limit: 100,
    });
    expect(await kit.accountBalance(fixture.account.id)).toMatchObject({
      availablePoints: '900', reservedPoints: '0',
    });
  });

  test('replays release requests exactly once', async () => {
    const { fixture, context, reservation } = await kit.quotedReservation('80');
    const replayInput = {
      releasedAt: new Date().toISOString(),
      idempotencyKey: idempotencyKey('release-replay'), requestHash: 'f'.repeat(64),
    };
    const first = await kit.release(context, reservation, replayInput);
    expect(await kit.release(context, reservation, replayInput)).toEqual(first);
    expect(await kit.transactionCount(fixture.account.id, ['RELEASE'])).toBe(1);
  });

  test('preserves exact program version attribution', async () => {
    const { context, quote, reservation } = await kit.quotedReservation('50');
    await kit.release(context, reservation);
    const [row] = await kit.sql<{ programVersionId: string }[]>`
      select program_version_id as "programVersionId"
      from loyalty.reservation where id = ${reservation.reservationId}
    `;
    expect(row?.programVersionId).toBe(quote.program.programVersionId);
  });
});
