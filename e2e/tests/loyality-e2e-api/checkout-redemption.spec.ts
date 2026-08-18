/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { idempotencyKey } from '../loyality-admin-api/helpers';
import { LoyaltyE2eTestKit } from './loyalty-e2e-test-kit';

test.describe('Loyalty checkout redemption end to end', () => {
  let kit: LoyaltyE2eTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyE2eTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  test('quotes reserves and commits an explicit points redemption', async () => {
    const { fixture, context, quote, reservation } = await kit.quotedReservation('250');
    expect(quote).toMatchObject({
      requestedPoints: '250', redeemablePoints: '250',
      discount: { amountMinor: '250', currencyCode: 'USD' },
      payableAfterLoyalty: { amountMinor: '750', currencyCode: 'USD' },
      basedOnCheckoutVersion: 1,
      basedOnPricingQuoteRevision: context.pricingQuoteRevision,
    });
    expect(await kit.accountBalance(fixture.account.id)).toMatchObject({
      availablePoints: '750', reservedPoints: '250',
    });

    const committed = await kit.commit(context, quote, reservation);
    expect(committed).toMatchObject({ status: 'COMMITTED', points: '250' });
    expect(await kit.accountBalance(fixture.account.id)).toMatchObject({
      availablePoints: '750', reservedPoints: '0',
    });
    expect(await kit.transactionCount(fixture.account.id, ['RESERVE', 'REDEEM'])).toBe(2);
  });

  test('uses the maximum allowed redemption when points are omitted', async () => {
    const fixture = await kit.fundedAccount('900', {
      maximumRedeemPointsPerOrder: '400', maximumOrderPercentageBps: 5_000,
    });
    const context = kit.checkoutContext({
      payableBeforeLoyalty: { amountMinor: '1000', currencyCode: 'USD' },
    });
    expect(await kit.quote(fixture, null, context)).toMatchObject({
      status: 'QUOTED',
      quote: {
        requestedPoints: null, redeemablePoints: '400',
        payableAfterLoyalty: { amountMinor: '600', currencyCode: 'USD' },
      },
    });
  });

  test('enforces minimum, available-balance and order boundaries', async () => {
    const fixture = await kit.fundedAccount('500', {
      minimumRedeemPoints: '100', maximumRedeemPointsPerOrder: '300',
      maximumOrderPercentageBps: 10_000,
    });
    const context = kit.checkoutContext({
      payableBeforeLoyalty: { amountMinor: '500', currencyCode: 'USD' },
    });
    expect(await kit.quote(fixture, '99', context)).toMatchObject({
      status: 'REJECTED', code: 'BELOW_MINIMUM_REDEMPTION',
    });
    expect(await kit.quote(fixture, '100', context)).toMatchObject({
      status: 'QUOTED', quote: { redeemablePoints: '100' },
    });
    expect(await kit.quote(fixture, '301', context)).toMatchObject({
      status: 'REJECTED', code: 'REQUEST_EXCEEDS_ORDER_LIMIT',
    });
  });

  test('enforces maximum order percentage without changing the pricing quote', async () => {
    const fixture = await kit.fundedAccount('1000', { maximumOrderPercentageBps: 3_333 });
    const context = kit.checkoutContext({
      payableBeforeLoyalty: { amountMinor: '1000', currencyCode: 'USD' },
    });
    const maximum = await kit.quote(fixture, null, context);
    expect(maximum).toMatchObject({
      status: 'QUOTED',
      quote: {
        basedOnPricingQuoteRevision: context.pricingQuoteRevision,
        discount: { amountMinor: '333', currencyCode: 'USD' },
        payableAfterLoyalty: { amountMinor: '667', currencyCode: 'USD' },
      },
    });
  });

  test('rejects disabled, wrong-currency, missing-customer and inactive-account redemption', async () => {
    const disabled = await kit.fundedAccount('100', { redemptionEnabled: false });
    expect(await kit.quote(disabled, '10')).toMatchObject({
      status: 'REJECTED', code: 'REDEMPTION_DISABLED',
    });

    const enabled = await kit.fundedAccount('100');
    expect(await kit.quote(enabled, '10', kit.checkoutContext({ currencyCode: 'EUR' }))).toMatchObject({
      status: 'REJECTED', code: 'CURRENCY_MISMATCH',
    });
    expect(await kit.quote(enabled, '10', kit.checkoutContext({ customerId: null }))).toMatchObject({
      status: 'NOT_APPLICABLE', code: 'CUSTOMER_REQUIRED',
    });
    await kit.setAccountStatus(enabled.account, 'SUSPENDED');
    expect(await kit.quote(enabled, '10')).toMatchObject({
      status: 'REJECTED', code: 'ACCOUNT_NOT_ACTIVE',
    });
  });

  test('rejects stale quote inputs and a concurrent balance change', async () => {
    const fixture = await kit.fundedAccount('200');
    const context = kit.checkoutContext();
    const quoted = await kit.quote(fixture, '150', context);
    expect(quoted.status).toBe('QUOTED');
    await kit.adjustPoints(fixture.account, 'DEBIT', '100', fixture.balanceRevision);
    expect(await kit.reserve(context, quoted.quote)).toMatchObject({
      status: 'REJECTED',
      code: expect.stringMatching(/CONCURRENT_BALANCE_CHANGE|INSUFFICIENT_AVAILABLE_POINTS/),
    });
    expect(await kit.reserve({ ...context, pricingQuoteRevision: crypto.randomUUID() }, quoted.quote))
      .toMatchObject({ status: 'REJECTED', code: 'QUOTE_MISMATCH' });
  });

  test('is idempotent under repeated reserve and commit requests', async () => {
    const fixture = await kit.fundedAccount();
    const context = kit.checkoutContext();
    const quoted = await kit.quote(fixture, '100', context);
    const reserveInput = {
      idempotencyKey: idempotencyKey('same-reserve'), requestHash: 'd'.repeat(64),
    };
    const first = await kit.reserve(context, quoted.quote, reserveInput);
    expect(await kit.reserve(context, quoted.quote, reserveInput)).toEqual(first);

    const commitInput = {
      orderId: crypto.randomUUID(), idempotencyKey: idempotencyKey('same-commit'),
      committedAt: new Date().toISOString(), requestHash: 'e'.repeat(64),
    };
    const committed = await kit.commit(context, quoted.quote, first, commitInput);
    expect(await kit.commit(context, quoted.quote, first, commitInput)).toEqual(committed);
    expect(await kit.transactionCount(fixture.account.id, ['RESERVE', 'REDEEM'])).toBe(2);
  });
});
