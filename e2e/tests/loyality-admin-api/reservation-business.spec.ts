/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { LoyaltyE2eTestKit } from '../loyality-e2e-api/loyalty-e2e-test-kit';
import { expectNoUserErrors, expectUserError, idempotencyKey } from './helpers';

test.describe('Loyalty Admin API reservation business transitions', () => {
  let kit: LoyaltyE2eTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyE2eTestKit(api, request);
    await kit.setupAdmin();
  });
  test.afterEach(async () => kit.close());

  async function reservation(rawId: string) {
    const id = kit.reservationGlobalId(rawId);
    const result = await kit.api.admin.query<any>('loyality-admin-api/Reservation', { variables: { id } });
    return result.data.loyaltyQuery.reservation;
  }

  test('releases an active reservation atomically and restores its exact lots', async () => {
    const { fixture, reservation: reserved } = await kit.quotedReservation('300');
    const before = await reservation(reserved.reservationId);
    const result = await kit.api.admin.mutation<any>('loyality-admin-api/ReservationRelease', {
      variables: { input: {
        reservationId: before.id,
        expectedRevision: before.revision,
        reasonCode: 'ADMIN_CUSTOMER_REQUEST',
        idempotencyKey: idempotencyKey('admin-release'),
      } },
    });
    const payload = result.data.loyaltyMutation.reservationRelease;
    expectNoUserErrors(payload);
    expect(payload.reservation).toMatchObject({
      status: 'RELEASED', revision: before.revision + 1,
      events: [
        expect.objectContaining({ eventType: 'CREATED', status: 'ACTIVE' }),
        expect.objectContaining({ eventType: 'RELEASED', previousStatus: 'ACTIVE', status: 'RELEASED', reasonCode: 'ADMIN_CUSTOMER_REQUEST' }),
      ],
    });
    expect(payload.transaction).toMatchObject({ kind: 'RELEASE', reasonCode: 'ADMIN_CUSTOMER_REQUEST' });
    expect(payload.transaction.entries.reduce((sum: bigint, entry: any) => sum + BigInt(entry.pointsDelta), 0n)).toBe(300n);
    expect(await kit.accountBalance(fixture.account.id)).toMatchObject({ availablePoints: '1000', reservedPoints: '0' });
    expect(await kit.transactionCount(fixture.account.id, ['RESERVE', 'RELEASE'])).toBe(2);
  });

  test('treats a repeated terminal release as a no-op without another restoration', async () => {
    const { fixture, reservation: reserved } = await kit.quotedReservation('80');
    const before = await reservation(reserved.reservationId);
    const input = { reservationId: before.id, expectedRevision: before.revision, reasonCode: 'ADMIN_RELEASE', idempotencyKey: idempotencyKey('admin-release-first') };
    const first = await kit.api.admin.mutation<any>('loyality-admin-api/ReservationRelease', { variables: { input } });
    expectNoUserErrors(first.data.loyaltyMutation.reservationRelease);
    const released = await reservation(reserved.reservationId);
    const repeated = await kit.api.admin.mutation<any>('loyality-admin-api/ReservationRelease', {
      variables: { input: {
        ...input,
        expectedRevision: released.revision,
        idempotencyKey: idempotencyKey('admin-release-noop'),
      } },
    });
    expectNoUserErrors(repeated.data.loyaltyMutation.reservationRelease);
    expect(repeated.data.loyaltyMutation.reservationRelease).toMatchObject({
      reservation: { id: released.id, status: 'RELEASED', revision: released.revision },
      transaction: null,
    });
    expect(await kit.transactionCount(fixture.account.id, ['RELEASE'])).toBe(1);
  });

  test('cannot release a committed reservation and leaves redeemed economics unchanged', async () => {
    const { fixture, context, quote, reservation: reserved } = await kit.quotedReservation('125');
    await kit.commit(context, quote, reserved);
    const committed = await reservation(reserved.reservationId);
    const result = await kit.api.admin.mutation<any>('loyality-admin-api/ReservationRelease', {
      variables: { input: {
        reservationId: committed.id,
        expectedRevision: committed.revision,
        reasonCode: 'INVALID_ADMIN_RELEASE',
        idempotencyKey: idempotencyKey('committed-release'),
      } },
    });
    expectUserError(result.data.loyaltyMutation.reservationRelease, 'RESERVATION_COMMITTED');
    expect(result.data.loyaltyMutation.reservationRelease).toMatchObject({ reservation: null, transaction: null });
    expect(await kit.accountBalance(fixture.account.id)).toMatchObject({ availablePoints: '875', reservedPoints: '0' });
    expect((await reservation(reserved.reservationId)).status).toBe('COMMITTED');
  });

  test('serializes concurrent admin releases to one economic restoration', async () => {
    const { fixture, reservation: reserved } = await kit.quotedReservation('60');
    const before = await reservation(reserved.reservationId);
    const calls = await Promise.all(['one', 'two'].map((suffix) => kit.api.admin.mutation<any>(
      'loyality-admin-api/ReservationRelease',
      { variables: { input: {
        reservationId: before.id,
        expectedRevision: before.revision,
        reasonCode: `CONCURRENT_${suffix}`,
        idempotencyKey: idempotencyKey(`concurrent-${suffix}`),
      } } },
    )));
    expect(calls.filter(({ data }: any) => data.loyaltyMutation.reservationRelease.userErrors.length === 0)).toHaveLength(1);
    expect(calls.filter(({ data }: any) => data.loyaltyMutation.reservationRelease.userErrors.length > 0)).toHaveLength(1);
    expect(await kit.accountBalance(fixture.account.id)).toMatchObject({ availablePoints: '1000', reservedPoints: '0' });
    expect(await kit.transactionCount(fixture.account.id, ['RELEASE'])).toBe(1);
  });
});
