/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { composeGlobalId } from '@utils/globalid';
import { expectUserError, idempotencyKey, setupStore } from './helpers';

test.describe('Loyalty Admin API reservations', () => {
  test.beforeEach(async ({ api }) => setupStore(api));

  test('returns null for a missing reservation without leaking storage IDs', async ({ api }) => {
    const id = composeGlobalId('LoyaltyReservation', crypto.randomUUID());
    const result = await api.admin.query<any>('loyality-admin-api/Reservation', { variables: { id } });
    expect(result.data.loyaltyQuery.reservation).toBeNull();
  });

  test('returns a stable empty filtered Relay connection', async ({ api }) => {
    const result = await api.admin.query<any>('loyality-admin-api/Reservations', { variables: { first: 20, where: { statuses: ['ACTIVE'], expiresBefore: new Date().toISOString() } } });
    expect(result.data.loyaltyQuery.reservations).toEqual({ totalCount: 0, edges: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null } });
  });

  test('rejects release of missing malformed and wrong-entity IDs safely', async ({ api }) => {
    for (const reservationId of [
      composeGlobalId('LoyaltyReservation', crypto.randomUUID()),
      composeGlobalId('LoyaltyProgram', crypto.randomUUID()),
    ]) {
      const result = await api.admin.mutation<any>('loyality-admin-api/ReservationRelease', { throwOnError: false, variables: { input: { reservationId,  reasonCode: 'ADMIN_RELEASE', idempotencyKey: idempotencyKey('reservation-release') } } });
      if (result.errors?.length) {
        expect(result.data?.loyaltyMutation?.reservationRelease?.reservation ?? null).toBeNull();
      } else {
        expectUserError(result.data.loyaltyMutation.reservationRelease);
        expect(result.data.loyaltyMutation.reservationRelease).toMatchObject({ reservation: null, transaction: null });
      }
    }
  });
});
