/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from '@playwright/test';
import { decodeGlobalId } from '@utils/globalid';
import {
  createProgram,
  createVersion,
  expectNoUserErrors,
  idempotencyKey,
  publishVersion,
  seedAccount,
  type Json,
} from '../loyality-admin-api/helpers';
import {
  CustomersStorefrontTestKit,
  type GraphQLResponse,
} from '../customers-storefront-api/customers-storefront-test-kit';

export const COPY_FIELDS = `
  headline description badge accessibilityLabel terms
`;

export const REWARD_FIELDS = `
  kind
  copy { ${COPY_FIELDS} }
  ... on LoyaltyPointsRewardPresentation { points { minimum maximum } accuracy }
  ... on LoyaltyMoneyRewardPresentation {
    amount { minimum { amount currencyCode } maximum { amount currencyCode } }
    accuracy
  }
  ... on LoyaltyPercentageRewardPresentation { percentage }
  ... on LoyaltyVoucherRewardPresentation { code }
  ... on LoyaltyFreeProductRewardPresentation { product { id } variant { id } quantity }
  ... on LoyaltyMemberBenefitRewardPresentation { code }
`;

export const OPPORTUNITY_FIELDS = `
  key type state remainingUses validUntil
  reward { ${REWARD_FIELDS} }
  presentation { ${COPY_FIELDS} }
`;

export const ACCOUNT_FIELDS = `
  id status
  balance { pendingPoints availablePoints reservedPoints debtPoints }
  tier { code name rank effectiveFrom effectiveTo }
  upcomingExpirations { points expiresAt }
  opportunities {
    primaryOpportunity { ${OPPORTUNITY_FIELDS} }
    opportunities { ${OPPORTUNITY_FIELDS} }
    evaluatedAt validUntil revision
  }
`;

export const PAGE_INFO_FIELDS = 'hasNextPage hasPreviousPage startCursor endCursor';

export interface LoyaltyFixture {
  program: Json;
  version: Json;
  account: Json;
}

const STOREFRONT_REWARD_DEFINITIONS = [
  { code: 'storefront-points', name: 'Points reward', rewardType: 'POINTS', configuration: { points: '1' } },
  { code: 'storefront-money', name: 'Money reward', rewardType: 'MONETARY_CREDIT', configuration: { amountMinor: '1', currencyCode: 'USD', walletType: 'STORE_CREDIT' } },
  { code: 'storefront-voucher', name: 'Voucher reward', rewardType: 'VOUCHER', configuration: { externalDiscountId: 'voucher' } },
  { code: 'storefront-fixed', name: 'Fixed discount', rewardType: 'FIXED_DISCOUNT', configuration: { externalDiscountId: 'fixed' } },
  { code: 'storefront-percentage', name: 'Percentage discount', rewardType: 'PERCENTAGE_DISCOUNT', configuration: { externalDiscountId: 'percentage' } },
  { code: 'storefront-shipping', name: 'Free shipping', rewardType: 'FREE_SHIPPING', configuration: { externalDiscountId: 'shipping' } },
  { code: 'storefront-product', name: 'Free product', rewardType: 'FREE_PRODUCT', configuration: { externalDiscountId: 'product' } },
  { code: 'storefront-benefit', name: 'Member benefit', rewardType: 'MEMBER_BENEFIT', configuration: { benefitCode: 'member-benefit' } },
];

export class LoyaltyStorefrontTestKit extends CustomersStorefrontTestKit {
  async setupLoyalty(options: { permission?: boolean } = {}): Promise<void> {
    await this.setup({ channel: false });
    await this.headless.install();
    const permissions = [
      'storefront.customer.read',
      'storefront.catalog.read',
      ...(options.permission === false ? [] : ['storefront.loyalty.read']),
    ];
    const created = await this.headless.create(
      `Loyalty storefront e2e ${crypto.randomUUID()}`,
      crypto.randomUUID(),
      permissions,
    );
    expect(created.userErrors).toEqual([]);
    expect(created.initialStorefrontCredentials).not.toBeNull();
    this.channelToken = created.initialStorefrontCredentials!.publicAccessToken;
  }

  async createActiveAccount(versionOverrides: Json = {}): Promise<LoyaltyFixture> {
    const program = await createProgram(this.api, { isDefault: true });
    const version = await createVersion(this.api, program, {
      ...versionOverrides,
      rewardDefinitions: [
        ...STOREFRONT_REWARD_DEFINITIONS,
        ...(versionOverrides.rewardDefinitions ?? []),
      ],
    });
    await publishVersion(this.api, version);
    const account = await seedAccount(this.api, program, { customerId: this.customer.rawId });
    return { program, version, account };
  }

  async loyaltyAccount<T = any>(selection = ACCOUNT_FIELDS): Promise<T | null> {
    const response = await this.customerQuery<{ loyaltyAccount: T | null }>(
      `loyaltyAccount { ${selection} }`,
    );
    expect(response.errors).toBeUndefined();
    return response.data?.customer?.loyaltyAccount ?? null;
  }

  async loyaltyAccountResponse<T = any>(
    selection = ACCOUNT_FIELDS,
    options: Parameters<CustomersStorefrontTestKit['graphql']>[2] = {},
  ): Promise<GraphQLResponse<{ customer: { loyaltyAccount: T | null } | null }>> {
    return this.customerQuery<{ loyaltyAccount: T | null }>(
      `loyaltyAccount { ${selection} }`,
      undefined,
      '',
      options,
    );
  }

  async adjustPoints(
    account: Json,
    direction: 'CREDIT' | 'DEBIT',
    points: string,
    balanceRevision = account.balanceRevision,
    description = `${direction.toLowerCase()} loyalty points`,
    expiresAt?: string,
  ): Promise<Json> {
    const result = await this.api.admin.mutation<Json>('loyality-admin-api/PointsAdjust', {
      variables: {
        input: {
          accountId: account.id,
          expectedBalanceRevision: balanceRevision,
          direction,
          points,
          reasonCode: 'ADMIN_CORRECTION',
          description,
          ...(expiresAt ? { expiresAt } : {}),
          metadata: { suite: 'loyality-storefront-api' },
          idempotencyKey: idempotencyKey('storefront-adjust'),
        },
      },
    });
    const payload = result.data.loyaltyMutation.pointsAdjust;
    expectNoUserErrors(payload);
    return payload;
  }

  async issueReward(
    account: Json,
    definitionId: string,
    overrides: Json = {},
  ): Promise<Json> {
    const result = await this.api.admin.mutation<Json>(
      'loyality-admin-api/RewardEntitlementIssue',
      {
        variables: {
          input: {
            accountId: account.id,
            rewardDefinitionId: definitionId,
            quantity: '1',
            reasonCode: 'E2E_ISSUE',
            idempotencyKey: idempotencyKey('storefront-reward'),
            ...overrides,
          },
        },
      },
    );
    const payload = result.data.loyaltyMutation.rewardEntitlementIssue;
    expectNoUserErrors(payload);
    return payload.rewardEntitlement;
  }

  async seedAvailableReward(
    fixture: LoyaltyFixture,
    rewardType: string,
    configuration: Json,
    overrides: Json = {},
  ): Promise<{ id: string; rawId: string; definitionId: string }> {
    const definition = fixture.version.rewardDefinitions.find((item: Json) => item.rewardType === rewardType);
    if (!definition) throw new Error(`No ${rewardType} reward definition exists in the fixture version`);
    const definitionId = decodeGlobalId(definition.id).id;
    const entitlementId = crypto.randomUUID();
    const accountId = decodeGlobalId(fixture.account.id).id;
    const status = overrides.status ?? 'ISSUED';
    const now = new Date();
    const validFrom = overrides.validFrom ?? new Date(now.getTime() - 60_000);
    const validTo = overrides.validTo ?? new Date(now.getTime() + 86_400_000);
    await this.sql`
        insert into loyalty.reward_entitlement (
          id, store_id, reward_definition_id, account_id, status,
          idempotency_key, configuration_schema_version, configuration_snapshot,
          quantity, valid_from, valid_to, reserved_for_checkout_id, redeemed_order_id,
          external_reference, issued_at, reserved_at, redeemed_at, expired_at,
          revoked_at, revision
        ) values (
          ${entitlementId}, ${this.realm.storeId}, ${definitionId}, ${accountId}, ${status},
          ${crypto.randomUUID()}, 1, ${this.sql.json(configuration)}, ${overrides.quantity ?? '1'},
          ${validFrom}, ${validTo},
          ${status === 'RESERVED' ? crypto.randomUUID() : null},
          ${status === 'REDEEMED' ? crypto.randomUUID() : null},
          ${overrides.externalReference ?? null}, ${overrides.issuedAt ?? now},
          ${status === 'RESERVED' ? now : null}, ${status === 'REDEEMED' ? now : null},
          ${status === 'EXPIRED' ? now : null}, ${status === 'REVOKED' ? now : null},
          ${overrides.revision ?? 1}
        )
    `;
    return { id: this.id('LoyaltyAvailableReward', entitlementId), rawId: entitlementId, definitionId };
  }

  async seedTierMembership(
    account: Json,
    version: Json,
    overrides: Json = {},
  ): Promise<{ tierId: string; membershipId: string }> {
    const tier = version.tiers?.[overrides.tierIndex ?? 0];
    if (!tier) throw new Error('seedTierMembership requires a tier created with the draft version');
    const tierId = decodeGlobalId(tier.id).id;
    const membershipId = crypto.randomUUID();
    const storeId = this.realm.storeId;
    const accountId = decodeGlobalId(account.id).id;
    const effectiveFrom = overrides.effectiveFrom ?? new Date(Date.now() - 60_000);
    const effectiveTo = overrides.effectiveTo ?? null;
    await this.sql.begin(async (sql) => {
      await sql`
        insert into loyalty.tier_membership (
          id, store_id, account_id, tier_id, status, effective_from, effective_to,
          evaluation_period_started_at, evaluation_period_ended_at, qualified_at, revision
        ) values (
          ${membershipId}, ${storeId}, ${accountId}, ${tierId},
          ${overrides.status ?? 'ACTIVE'}, ${effectiveFrom}, ${effectiveTo}, now(),
          now() + interval '1 second', now(), 1
        )
      `;
    });
    return { tierId, membershipId };
  }

  async setBalance(account: Json, values: Partial<{
    pendingPoints: string;
    availablePoints: string;
    reservedPoints: string;
    debtPoints: string;
  }>): Promise<void> {
    const accountId = decodeGlobalId(account.id).id;
    await this.sql`
      update loyalty.account_balance set
        pending_points = ${values.pendingPoints ?? '0'},
        available_points = ${values.availablePoints ?? '0'},
        reserved_points = ${values.reservedPoints ?? '0'},
        debt_points = ${values.debtPoints ?? '0'},
        revision = revision + 1
      where account_id = ${accountId}
    `;
  }

  async setAccountStatus(account: Json, status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED' | 'MERGED') {
    const accountId = decodeGlobalId(account.id).id;
    if (status === 'MERGED') {
      const targetId = crypto.randomUUID();
      await this.sql.begin(async (sql) => {
        await sql`
          insert into loyalty.account (id, store_id, program_id, customer_id, status, revision)
          select ${targetId}, store_id, program_id, ${crypto.randomUUID()}, 'ACTIVE', 1
          from loyalty.account where id = ${accountId}
        `;
        await sql`
          update loyalty.account set status = 'MERGED', merged_into_account_id = ${targetId},
            closed_at = now(), suspended_at = null, suspended_reason = null,
            revision = revision + 1 where id = ${accountId}
        `;
      });
      return;
    }
    await this.sql`
      update loyalty.account set status = ${status}, revision = revision + 1,
        merged_into_account_id = null,
        suspended_at = ${status === 'SUSPENDED' ? new Date() : null},
        suspended_reason = ${status === 'SUSPENDED' ? 'loyalty storefront e2e' : null},
        closed_at = ${status === 'CLOSED' ? new Date() : null}
      where id = ${accountId}
    `;
  }

  async seedTransaction(
    fixture: LoyaltyFixture,
    kind: string,
    points: bigint,
    overrides: Json = {},
  ): Promise<string> {
    const transactionId = crypto.randomUUID();
    const entryId = crypto.randomUUID();
    const accountId = decodeGlobalId(fixture.account.id).id;
    const programId = decodeGlobalId(fixture.program.id).id;
    const occurredAt = overrides.occurredAt ?? new Date().toISOString();
    const effectiveAt = overrides.effectiveAt ?? occurredAt;
    const signedPoints = BigInt(overrides.pointsDelta ?? points);
    await this.sql.begin(async (sql) => {
      await sql`
        insert into loyalty.transaction (
          id, store_id, account_id, program_id, kind, source, idempotency_key,
          request_hash, actor_type, reason_code, description, occurred_at,
          effective_at, metadata
        ) values (
          ${transactionId}, ${this.realm.storeId}, ${accountId}, ${programId},
          ${kind}, ${overrides.source ?? 'SYSTEM'}, ${crypto.randomUUID()},
          ${'a'.repeat(64)}, 'SYSTEM', ${overrides.reasonCode ?? 'E2E'},
          ${overrides.description ?? null}, ${occurredAt}, ${effectiveAt},
          ${sql.json(overrides.metadata ?? { points: (points < 0n ? -points : points).toString() })}
        )
      `;
      await sql`
        insert into loyalty.ledger_entry (
          id, store_id, transaction_id, account_id, bucket, points_delta, sequence
        ) values (
          ${entryId}, ${this.realm.storeId}, ${transactionId}, ${accountId},
          ${overrides.bucket ?? 'AVAILABLE'}, ${signedPoints.toString()}, 1
        )
      `;
    });
    return this.id('LoyaltyTransaction', transactionId);
  }

  async seedRuleUsage(
    ruleId: string,
    scopeKey: string,
    values: Partial<{ occurrenceCount: string; pointsAwarded: string; monetaryAmounts: Json }> = {},
  ): Promise<void> {
    await this.sql`
      insert into loyalty.earning_rule_usage (
        store_id, earning_rule_id, scope_key, window_started_at,
        occurrence_count, points_awarded, monetary_amounts
      ) values (
        ${this.realm.storeId}, ${decodeGlobalId(ruleId).id}, ${scopeKey},
        ${new Date(0)}, ${values.occurrenceCount ?? '0'}, ${values.pointsAwarded ?? '0'},
        ${this.sql.json(values.monetaryAmounts ?? {})}
      )
    `;
  }

  async createProduct(priceMinor = '1000', publish = true) {
    const suffix = crypto.randomUUID().slice(0, 10);
    const created = await this.api.admin.mutation<Json>('inventory-api/ProductCreateSimple', {
      variables: { input: { title: `Loyalty product ${suffix}`, handle: `loyalty-${suffix}` } },
    });
    const payload = created.data.catalogMutation.productCreate;
    expect(payload.userErrors).toEqual([]);
    const product = payload.product;
    const variant = product.variants.edges[0]?.node;
    expect(variant).toBeTruthy();
    const priced = await this.api.admin.mutation<Json>('inventory-api/VariantSetPricing', {
      variables: { input: { variantId: variant.id, currency: 'USD', amountMinor: priceMinor } },
    });
    expect(priced.data.catalogMutation.variantUpdatePricing.userErrors).toEqual([]);
    await this.sql`
      update catalog.inventory_item set continue_selling_when_out_of_stock = true,
        updated_at = now() where variant_id = ${decodeGlobalId(variant.id).id}
    `;
    if (publish) {
      const updated = await this.api.admin.mutation<Json>('inventory-api/ProductUpdate', {
        variables: {
          productId: product.id,
          expectedRevision: product.revision,
          operations: { status: 'PUBLISHED' },
        },
      });
      expect(updated.data.catalogMutation.productUpdate.userErrors).toEqual([]);
    }
    return { productId: product.id as string, variantId: variant.id as string };
  }

  entityQuery<T>(
    typename: 'Product' | 'ProductVariant',
    id: string,
    selection: string,
    options: Parameters<CustomersStorefrontTestKit['graphql']>[2] = {},
  ): Promise<GraphQLResponse<{ entities: Array<T | null> }>> {
    return this.graphql<{ entities: Array<T | null> }>(
      `query LoyaltyEntity($ids: [ID!]!) {
        entities: nodes(ids: $ids) {
          ... on ${typename} { id ${selection} }
        }
      }`,
      { ids: [id] },
      options,
    );
  }
}
