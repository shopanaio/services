import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { decodeGlobalId } from '@utils/globalid';
import { idempotencyKey, seedAccount } from '../loyality-admin-api/helpers';
import { LoyaltyStorefrontTestKit, PAGE_INFO_FIELDS, REWARD_FIELDS, COPY_FIELDS } from './loyalty-storefront-test-kit';

test.describe('Loyalty Storefront API available rewards', () => {
  let kit: LoyaltyStorefrontTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyStorefrontTestKit(api, request);
    await kit.setupLoyalty();
  });

  test.afterEach(async () => kit.close());

  async function rewards(first = 20, after?: string) {
    return kit.loyaltyAccount(`availableRewards(first: ${first}${after ? `, after: "${after}"` : ''}) {
      nodes { id reward { ${REWARD_FIELDS} } presentation { ${COPY_FIELDS} } issuedAt validUntil revision }
      edges { cursor node { id } }
      totalCount pageInfo { ${PAGE_INFO_FIELDS} }
    }`);
  }

  test('presents every supported reward kind', async () => {
    const fixture = await kit.createActiveAccount();
    const product = await kit.createProduct();
    const productId = decodeGlobalId(product.productId).id;
    const variantId = decodeGlobalId(product.variantId).id;
    const definitions = [
      ['POINTS', { points: '10' }],
      ['MONETARY_CREDIT', { amountMinor: '100', currencyCode: 'USD', walletType: 'CASHBACK' }],
      ['MONETARY_CREDIT', { amountMinor: '200', currencyCode: 'USD', walletType: 'STORE_CREDIT' }],
      ['VOUCHER', { code: 'GENERIC', externalDiscountId: 'voucher' }],
      ['FIXED_DISCOUNT', { amountMinor: '300', currencyCode: 'USD', externalDiscountId: 'fixed' }],
      ['PERCENTAGE_DISCOUNT', { percentage: '12.5', externalDiscountId: 'percentage' }],
      ['FREE_SHIPPING', { externalDiscountId: 'shipping' }],
      ['FREE_PRODUCT', { externalDiscountId: 'product', productId, variantId, quantity: '1' }],
      ['MEMBER_BENEFIT', { benefitCode: 'priority', code: 'priority' }],
    ] as const;
    for (const [type, configuration] of definitions) {
      await kit.seedAvailableReward(fixture, type, configuration);
    }
    const kinds = (await rewards())?.availableRewards.nodes.map(({ reward }: any) => reward.kind);
    expect(kinds?.sort()).toEqual([
      'CASHBACK', 'FIXED_DISCOUNT', 'FREE_PRODUCT', 'FREE_SHIPPING', 'MEMBER_BENEFIT',
      'PERCENTAGE_DISCOUNT', 'POINTS', 'STORE_CREDIT', 'VOUCHER',
    ].sort());
  });

  test('returns only issued rewards currently inside their validity window', async () => {
    const fixture = await kit.createActiveAccount();
    await kit.seedAvailableReward(fixture, 'POINTS', { points: '1' });
    for (const status of ['RESERVED', 'REDEEMED', 'EXPIRED', 'REVOKED']) {
      await kit.seedAvailableReward(fixture, 'POINTS', { points: '1' }, { status });
    }
    await kit.seedAvailableReward(fixture, 'POINTS', { points: '1' }, {
      validFrom: new Date(Date.now() + 86_400_000), validTo: new Date(Date.now() + 172_800_000),
    });
    expect((await rewards())?.availableRewards.totalCount).toBe(1);
  });

  test('treats validFrom as inclusive and validUntil as exclusive', async () => {
    const fixture = await kit.createActiveAccount();
    const available = await kit.seedAvailableReward(fixture, 'POINTS', { points: '1' }, {
      validFrom: new Date(Date.now() - 1), validTo: new Date(Date.now() + 60_000),
    });
    await kit.seedAvailableReward(fixture, 'POINTS', { points: '2' }, {
      validFrom: new Date(Date.now() + 60_000), validTo: new Date(Date.now() + 120_000),
    });
    const result = await rewards();
    expect(result?.availableRewards.nodes.map(({ id }: any) => id)).toEqual([available.id]);
  });

  test('multiplies structured reward values by entitlement quantity', async () => {
    const fixture = await kit.createActiveAccount();
    await kit.seedAvailableReward(fixture, 'POINTS', { points: '7' }, { quantity: '3' });
    await kit.seedAvailableReward(fixture, 'MONETARY_CREDIT', {
      amountMinor: '125', currencyCode: 'USD', walletType: 'STORE_CREDIT',
    }, { quantity: '4' });
    const values = (await rewards())?.availableRewards.nodes.map(({ reward }: any) => reward);
    expect(values).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'POINTS', points: { minimum: '21', maximum: '21' } }),
      expect.objectContaining({
        kind: 'STORE_CREDIT',
        amount: {
          minimum: { amount: '5.00', currencyCode: 'USD' },
          maximum: { amount: '5.00', currencyCode: 'USD' },
        },
      }),
    ]));
  });

  test('uses entitlement external reference for a concrete voucher code', async () => {
    const fixture = await kit.createActiveAccount();
    await kit.seedAvailableReward(fixture, 'VOUCHER', {
      externalDiscountId: 'internal-discount', code: 'GENERIC',
    }, { externalReference: 'CUSTOMER-7X9' });
    const node = (await rewards())?.availableRewards.nodes[0];
    expect(node.reward).toMatchObject({ kind: 'VOUCHER', code: 'CUSTOMER-7X9' });
    expect(JSON.stringify(node)).not.toContain('internal-discount');
  });

  test('returns localized presentation and structured reward copy consistently', async () => {
    const fixture = await kit.createActiveAccount();
    await kit.updateCustomerRow({ preferredLocale: 'uk' });
    await kit.seedAvailableReward(fixture, 'POINTS', {
      points: '10',
      presentation: {
        headline: 'Default',
        locales: { uk: { headline: 'Бонус', badge: '+10', accessibilityLabel: 'Десять балів', terms: ['Разово'] } },
      },
    }, { name: 'Fallback reward' });
    const node = (await rewards())?.availableRewards.nodes[0];
    expect(node.presentation).toEqual(node.reward.copy);
    expect(node.presentation).toMatchObject({ headline: 'Бонус', badge: '+10', accessibilityLabel: 'Десять балів' });
  });

  test('paginates available rewards with nodes and edges in identical order', async () => {
    const fixture = await kit.createActiveAccount();
    for (let index = 0; index < 5; index += 1) {
      await kit.seedAvailableReward(fixture, 'POINTS', { points: String(index + 1) }, {
        issuedAt: new Date(Date.now() + index * 1000),
      });
    }
    const first = await rewards(2);
    const second = await rewards(2, first?.availableRewards.pageInfo.endCursor);
    expect(first?.availableRewards.nodes.map(({ id }: any) => id))
      .toEqual(first?.availableRewards.edges.map(({ node }: any) => node.id));
    expect(second?.availableRewards.nodes.map(({ id }: any) => id))
      .toEqual(second?.availableRewards.edges.map(({ node }: any) => node.id));
    const ids = [...first!.availableRewards.nodes, ...second!.availableRewards.nodes].map(({ id }: any) => id);
    expect(new Set(ids).size).toBe(4);
    expect(first?.availableRewards).toMatchObject({ totalCount: 5, pageInfo: { hasNextPage: true } });
  });

  test('changes the opaque revision on entitlement state or validity changes', async () => {
    const fixture = await kit.createActiveAccount();
    const entitlement = await kit.seedAvailableReward(fixture, 'POINTS', { points: '1' });
    const before = (await rewards())?.availableRewards.nodes[0].revision;
    const revoked = await kit.api.admin.mutation<any>('loyality-admin-api/RewardEntitlementRevoke', {
      variables: { input: {
        entitlementId: entitlement.id, expectedRevision: 1, reasonCode: 'E2E_REVOKED',
        idempotencyKey: idempotencyKey('storefront-revoke'),
      } },
    });
    expect(revoked.data.loyaltyMutation.rewardEntitlementRevoke.userErrors).toEqual([]);
    expect(revoked.data.loyaltyMutation.rewardEntitlementRevoke.rewardEntitlement.revision).toBe(2);
    expect(before).toEqual(expect.any(String));
    expect((await rewards())?.availableRewards.nodes).toEqual([]);
  });

  test('cannot expose another customer or store reward', async () => {
    const fixture = await kit.createActiveAccount();
    const foreign = await kit.createGuestCustomer();
    const foreignAccount = await seedAccount(kit.api, fixture.program, { customerId: foreign.id });
    await kit.seedAvailableReward({ ...fixture, account: foreignAccount }, 'POINTS', { points: '999' });
    expect((await rewards())?.availableRewards).toMatchObject({ totalCount: 0, nodes: [] });
  });
});
