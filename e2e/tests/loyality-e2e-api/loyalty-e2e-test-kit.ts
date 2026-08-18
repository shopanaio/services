/* eslint-disable @typescript-eslint/no-explicit-any */
import type { APIRequestContext } from '@playwright/test';
import { expect } from '@playwright/test';
import { composeGlobalId, decodeGlobalId } from '@utils/globalid';
import {
  idempotencyKey,
  type Api,
  type Json,
} from '../loyality-admin-api/helpers';
import {
  LoyaltyStorefrontTestKit,
  type LoyaltyFixture,
} from '../loyality-storefront-api/loyalty-storefront-test-kit';

const ACTION_PROXY_URL =
  process.env.TEST_ACTION_PROXY_URL ??
  `http://127.0.0.1:${process.env.TEST_ACTION_PROXY_PORT ?? '15000'}`;

export type ActionResult<T extends Json = Json> =
  | { ok: true; result: T }
  | { ok: false; code: string; message: string; retryable: boolean };

export interface FundedFixture extends LoyaltyFixture {
  balanceRevision: number;
}

export class LoyaltyE2eTestKit extends LoyaltyStorefrontTestKit {
  constructor(api: Api, request: APIRequestContext) {
    super(api, request);
  }

  async setup(): Promise<void> {
    await this.setupLoyalty();
  }

  async setupAdmin(): Promise<void> {
    await this.api.session.setupUserAndStore({ currencyCode: 'USD' });
    const organizationId = this.api.session.organizationId;
    if (!organizationId) throw new Error('Missing organization after loyalty test setup');
    const storeGlobalId = this.api.session.project.id;
    const customerId = crypto.randomUUID();
    this.realm = {
      applicationId: '',
      clientId: '',
      organizationId: decodeGlobalId(organizationId).id,
      resource: '',
      storeId: decodeGlobalId(storeGlobalId).id,
      storeGlobalId,
      storeName: this.api.session.project.name,
      redirectUri: '',
      origin: '',
    };
    this.customer = {
      id: composeGlobalId('Customer', customerId),
      rawId: customerId,
      iamPrincipalId: crypto.randomUUID(),
      email: `loyalty-${customerId}@playwright.dev`,
      revision: 1,
    };
  }

  async callAction<T extends Json>(action: string, params: Json): Promise<T> {
    const response = await this.request.post(`${ACTION_PROXY_URL}/__test/actions/call`, {
      data: { action, params },
    });
    expect(response.ok(), await response.text()).toBe(true);
    const body = (await response.json()) as ActionResult<T>;
    expect(body.ok).toBe(true);
    if (!body.ok) throw new Error(`${body.code}: ${body.message}`);
    return body.result;
  }

  async fundedAccount(
    points = '1000',
    versionOverrides: Json = {},
  ): Promise<FundedFixture> {
    const fixture = await this.createActiveAccount(versionOverrides);
    const adjusted = await this.adjustPoints(fixture.account, 'CREDIT', points);
    return {
      ...fixture,
      balanceRevision: adjusted.account.balance.revision,
    };
  }

  checkoutContext(overrides: Json = {}): Json {
    const now = new Date();
    return {
      executionId: crypto.randomUUID(),
      checkoutId: crypto.randomUUID(),
      checkoutVersion: 1,
      storeId: this.realm.storeId,
      customerId: this.customer.rawId,
      currencyCode: 'USD',
      channelCode: 'WEB',
      effectiveAt: now.toISOString(),
      requestedAt: now.toISOString(),
      deadlineAt: new Date(now.getTime() + 60_000).toISOString(),
      correlationId: crypto.randomUUID(),
      pricingQuoteId: crypto.randomUUID(),
      pricingQuoteRevision: crypto.randomUUID(),
      payableBeforeLoyalty: { amountMinor: '1000', currencyCode: 'USD' },
      customerEligibilityRevision: crypto.randomUUID(),
      segmentIds: [],
      segmentMembershipRevision: crypto.randomUUID(),
      ...overrides,
    };
  }

  quote(
    fixture: LoyaltyFixture,
    requestedPoints: string | null,
    context = this.checkoutContext(),
  ): Promise<Json> {
    return this.callAction('loyalty.quoteCheckoutLoyaltyRedemption', {
      context,
      requestedPoints,
      programId: decodeGlobalId(fixture.program.id).id,
    });
  }

  reserve(context: Json, quote: Json, overrides: Json = {}): Promise<Json> {
    return this.callAction('loyalty.reserveCheckoutLoyaltyRedemption', {
      context,
      quote,
      idempotencyKey: idempotencyKey('reserve'),
      requestHash: 'a'.repeat(64),
      ...overrides,
    });
  }

  commit(context: Json, quote: Json, reservation: Json, overrides: Json = {}): Promise<Json> {
    return this.callAction('loyalty.commitCheckoutLoyaltyRedemption', {
      storeId: context.storeId,
      checkoutId: context.checkoutId,
      checkoutVersion: context.checkoutVersion,
      reservationId: reservation.reservationId,
      quoteId: quote.quoteId,
      quoteRevision: quote.revision,
      orderId: crypto.randomUUID(),
      orderRevision: 1,
      committedAt: new Date().toISOString(),
      idempotencyKey: idempotencyKey('commit'),
      requestHash: 'b'.repeat(64),
      ...overrides,
    });
  }

  release(context: Json, reservation: Json, overrides: Json = {}): Promise<Json> {
    return this.callAction('loyalty.releaseCheckoutLoyaltyRedemption', {
      storeId: context.storeId,
      checkoutId: context.checkoutId,
      reservationId: reservation.reservationId,
      reason: 'CUSTOMER_REQUEST',
      releasedAt: new Date().toISOString(),
      idempotencyKey: idempotencyKey('release'),
      requestHash: 'c'.repeat(64),
      ...overrides,
    });
  }

  async quotedReservation(
    points = '100',
    fixture?: LoyaltyFixture,
    context?: Json,
  ) {
    const resolvedFixture = fixture ?? await this.fundedAccount();
    const resolvedContext = context ?? this.checkoutContext();
    const quoted = await this.quote(resolvedFixture, points, resolvedContext);
    expect(quoted.status).toBe('QUOTED');
    const reserved = await this.reserve(resolvedContext, quoted.quote);
    expect(reserved.status).toBe('RESERVED');
    return {
      fixture: resolvedFixture,
      context: resolvedContext,
      quote: quoted.quote,
      reservation: reserved,
    };
  }

  orderRewardEvent(overrides: Json = {}): Json {
    const now = new Date().toISOString();
    const orderId = overrides.orderId ?? crypto.randomUUID();
    const orderLineId = overrides.orderLineId ?? crypto.randomUUID();
    return {
      eventId: overrides.eventId ?? crypto.randomUUID(),
      eventType: 'orderRewardEligible',
      timestamp: now,
      source: 'orders',
      emitKey: `order-reward:${orderId}:1`,
      context: {
        organizationId: this.realm.organizationId,
        correlationId: crypto.randomUUID(),
      },
      subject: { type: 'order', id: orderId },
      payload: {
        schemaVersion: 1,
        orderId,
        orderRevision: 1,
        storeId: this.realm.storeId,
        customerId: this.customer.rawId,
        currencyCode: 'USD',
        channelCode: 'WEB',
        customerEligibilityRevision: crypto.randomUUID(),
        segmentIds: [],
        segmentMembershipRevision: crypto.randomUUID(),
        eligibleAmountAfterProductDiscountsMinor: '1000',
        eligibleAmountAfterAllDiscountsMinor: '1000',
        eligibleAt: now,
        pricingQuoteId: crypto.randomUUID(),
        pricingQuoteRevision: crypto.randomUUID(),
        lines: [{
          orderLineId,
          productId: crypto.randomUUID(),
          variantId: crypto.randomUUID(),
          categoryIds: [], tagIds: [], featureIds: [], optionValueIds: [],
          quantity: 1,
          eligibleAmountAfterProductDiscountsMinor: '1000',
          eligibleAmountAfterAllDiscountsMinor: '1000',
        }],
        ...overrides.payload,
      },
      ...Object.fromEntries(
        Object.entries(overrides).filter(([key]) => ![
          'eventId', 'orderId', 'orderLineId', 'payload',
        ].includes(key)),
      ),
    };
  }

  deliverEvent(event: Json, overrides: Json = {}): Promise<Json> {
    return this.callAction(`loyalty.${event.eventType}`, {
      event,
      delivery: {
        jobId: crypto.randomUUID(), attempt: 1, maxAttempts: 10,
        idempotencyKey: `event:${event.eventId}`,
        ...overrides,
      },
    });
  }

  reservationGlobalId(rawId: string): string {
    return composeGlobalId('LoyaltyReservation', rawId);
  }

  async accountBalance(accountId: string): Promise<Json> {
    const [row] = await this.sql<Json[]>`
      select pending_points as "pendingPoints",
             available_points as "availablePoints",
             reserved_points as "reservedPoints",
             debt_points as "debtPoints",
             revision
      from loyalty.account_balance
      where account_id = ${decodeGlobalId(accountId).id}
    `;
    expect(row).toBeTruthy();
    return row!;
  }

  async transactionCount(accountId: string, kinds?: string[]): Promise<number> {
    const [row] = await this.sql<{ count: number }[]>`
      select count(*)::int as count
      from loyalty.transaction
      where account_id = ${decodeGlobalId(accountId).id}
        and (${kinds ?? null}::text[] is null or kind::text = any(${kinds ?? null}::text[]))
    `;
    return row?.count ?? 0;
  }
}
