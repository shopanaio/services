import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { LoyaltyStorefrontTestKit, OPPORTUNITY_FIELDS } from './loyalty-storefront-test-kit';

const rule = (actionType: string, action: Record<string, unknown>) => ({
  code: `rule-${crypto.randomUUID().slice(0, 8)}`, name: 'Configured reward', priority: 1,
  triggerType: 'ORDER', triggerConfig: {}, conditions: { type: 'ALL', conditions: [] },
  actionType, action, limits: {},
});

test.describe('Loyalty Storefront API presentation values and localization', () => {
  let kit: LoyaltyStorefrontTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyStorefrontTestKit(api, request);
    await kit.setupLoyalty();
  });

  test.afterEach(async () => kit.close());

  async function loyalty(productId: string) {
    const response = await kit.entityQuery<any>('Product', productId, `loyalty {
      primaryOpportunity { ${OPPORTUNITY_FIELDS} }
      purchaseOpportunities { ${OPPORTUNITY_FIELDS} }
    }`);
    expect(response.errors).toBeUndefined();
    return response.data?.entities[0]?.loyalty;
  }

  for (const [roundingMode, expected] of [['DOWN', '1'], ['NEAREST', '2'], ['UP', '2']] as const) {
    test(`calculates standard purchase points with ${roundingMode} rounding`, async () => {
      await kit.createActiveAccount({ roundingMode });
      const product = await kit.createProduct('150');
      expect((await loyalty(product.productId)).purchaseOpportunities.at(-1).reward.points).toEqual({ minimum: expected, maximum: expected });
    });
  }

  test('presents fixed points and spend-ratio rule actions', async () => {
    await kit.createActiveAccount({ earningRules: [
      rule('AWARD_FIXED_POINTS', { type: 'AWARD_FIXED_POINTS', points: '25' }),
      rule('AWARD_SPEND_RATIO', { type: 'AWARD_SPEND_RATIO', points: '3', amountMinor: '100' }),
    ] });
    const product = await kit.createProduct('1000');
    const rewards = (await loyalty(product.productId)).purchaseOpportunities.map(({ reward }: any) => reward);
    expect(rewards).toEqual(expect.arrayContaining([
      expect.objectContaining({ accuracy: 'EXACT', points: { minimum: '25', maximum: '25' } }),
      expect.objectContaining({ accuracy: 'ESTIMATED', points: { minimum: '30', maximum: '30' } }),
    ]));
  });

  test('presents point and monetary cashback rule actions', async () => {
    await kit.createActiveAccount({ earningRules: [
      rule('AWARD_CASHBACK', { type: 'AWARD_CASHBACK', basisPoints: 500, settlement: 'POINTS', currencyCode: null }),
      rule('AWARD_CASHBACK', { type: 'AWARD_CASHBACK', basisPoints: 1000, settlement: 'MONETARY', currencyCode: 'USD' }),
    ] });
    const product = await kit.createProduct('1000');
    const rewards = (await loyalty(product.productId)).purchaseOpportunities.map(({ reward }: any) => reward);
    expect(rewards).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'POINTS', points: { minimum: '0', maximum: '0' } }),
      expect.objectContaining({ kind: 'CASHBACK', amount: {
        minimum: { amount: '1.00', currencyCode: 'USD' }, maximum: { amount: '1.00', currencyCode: 'USD' },
      } }),
    ]));
  });

  test('presents incremental points from multiplier actions', async () => {
    await kit.createActiveAccount({ earningRules: [rule('APPLY_MULTIPLIER', {
      type: 'APPLY_MULTIPLIER', multiplierBps: 20_000,
    })] });
    const product = await kit.createProduct('1000');
    const configured = (await loyalty(product.productId)).purchaseOpportunities[0];
    expect(configured.reward.points).toEqual({ minimum: '10', maximum: '10' });
  });

  test('presents every issued reward definition with its concrete GraphQL type', async () => {
    const fixture = await kit.createActiveAccount();
    for (const [type, config] of [
      ['POINTS', { points: '10' }],
      ['VOUCHER', { externalDiscountId: 'voucher', code: 'CODE' }],
      ['PERCENTAGE_DISCOUNT', { externalDiscountId: 'discount', percentage: '5' }],
      ['FREE_SHIPPING', { externalDiscountId: 'shipping' }],
      ['MEMBER_BENEFIT', { benefitCode: 'vip', code: 'vip' }],
    ] as const) await kit.seedAvailableReward(fixture, type, config);
    const account = await kit.loyaltyAccount(`availableRewards { nodes { reward {
      kind __typename
      ... on LoyaltyPointsRewardPresentation { points { minimum maximum } }
      ... on LoyaltyVoucherRewardPresentation { code }
      ... on LoyaltyPercentageRewardPresentation { percentage }
      ... on LoyaltyMemberBenefitRewardPresentation { code }
    } } }`);
    expect(account?.availableRewards.nodes.map(({ reward }: any) => reward.kind).sort())
      .toEqual(['MEMBER_BENEFIT', 'PERCENTAGE_DISCOUNT', 'POINTS', 'FREE_SHIPPING', 'VOUCHER'].sort());
  });

  test('formats currencies with zero two and three decimal places', async () => {
    const fixture = await kit.createActiveAccount();
    await kit.seedAvailableReward(fixture, 'MONETARY_CREDIT', { amountMinor: '12345', currencyCode: 'USD', walletType: 'CASHBACK' });
    const result = await kit.loyaltyAccount(`availableRewards { nodes { reward {
      ... on LoyaltyMoneyRewardPresentation { amount { minimum { amount currencyCode } maximum { amount currencyCode } } }
    } } }`);
    expect(result?.availableRewards.nodes[0].reward.amount.minimum).toEqual({ amount: '123.45', currencyCode: 'USD' });
  });

  test('never loses precision for large unsigned values', async () => {
    const fixture = await kit.createActiveAccount();
    await kit.setBalance(fixture.account, { availablePoints: '9007199254740993' });
    await kit.seedAvailableReward(fixture, 'POINTS', { points: '9007199254740993' }, { quantity: '2' });
    const result = await kit.loyaltyAccount(`balance { availablePoints } availableRewards { nodes { reward {
      ... on LoyaltyPointsRewardPresentation { points { minimum maximum } }
    } } }`);
    expect(result).toMatchObject({
      balance: { availablePoints: '9007199254740993' },
      availableRewards: { nodes: [{ reward: { points: { minimum: '18014398509481986', maximum: '18014398509481986' } } }] },
    });
  });

  test('selects exact locale language fallback and default copy in order', async () => {
    const fixture = await kit.createActiveAccount();
    await kit.updateCustomerRow({ preferredLocale: 'uk-UA' });
    await kit.seedAvailableReward(fixture, 'POINTS', {
      points: '1', presentation: { headline: 'Default', locales: {
        uk: { headline: 'Мовний fallback' }, 'uk-UA': { headline: 'Точна локаль' },
      } },
    });
    const result = await kit.loyaltyAccount('availableRewards { nodes { presentation { headline } } }');
    expect(result?.availableRewards.nodes[0].presentation.headline).toBe('Точна локаль');
  });

  test('provides accessibility labels badges descriptions and terms without client synthesis', async () => {
    const fixture = await kit.createActiveAccount();
    await kit.seedAvailableReward(fixture, 'POINTS', { points: '1', presentation: {
      headline: 'One point', description: 'Details', badge: '+1',
      accessibilityLabel: 'Earn one loyalty point', terms: ['Once per customer'],
    } });
    const result = await kit.loyaltyAccount(`availableRewards { nodes { presentation {
      headline description badge accessibilityLabel terms
    } } }`);
    expect(result?.availableRewards.nodes[0].presentation).toEqual({
      headline: 'One point', description: 'Details', badge: '+1',
      accessibilityLabel: 'Earn one loyalty point', terms: ['Once per customer'],
    });
  });
});
