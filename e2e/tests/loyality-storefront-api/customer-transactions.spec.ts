import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { LoyaltyStorefrontTestKit, PAGE_INFO_FIELDS } from './loyalty-storefront-test-kit';

const TRANSACTION_FIELDS = `
  id type direction points description occurredAt effectiveAt expiresAt
`;

test.describe('Loyalty Storefront API customer transaction history', () => {
  let kit: LoyaltyStorefrontTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyStorefrontTestKit(api, request);
    await kit.setupLoyalty();
  });

  test.afterEach(async () => kit.close());

  async function transactions(first = 20, after?: string) {
    return kit.loyaltyAccount(`transactions(first: ${first}${after ? ', after: "' + after + '"' : ''}) {
      nodes: edges { cursor node { ${TRANSACTION_FIELDS} } }
      totalCount pageInfo { ${PAGE_INFO_FIELDS} }
    }`);
  }

  test('maps earned redeemed expired refunded and adjusted transactions', async () => {
    const fixture = await kit.createActiveAccount();
    const cases = [
      ['EARN_PENDING', 10n, 'EARNED', 'CREDIT'],
      ['REDEEM', -9n, 'REDEEMED', 'DEBIT'],
      ['EXPIRE', -8n, 'EXPIRED', 'DEBIT'],
      ['RESTORE_REDEEM', 7n, 'REFUNDED', 'CREDIT'],
      ['ADJUST_CREDIT', 6n, 'ADJUSTED', 'CREDIT'],
      ['ADJUST_DEBIT', -5n, 'ADJUSTED', 'DEBIT'],
    ] as const;
    for (const [kind, points] of cases) await kit.seedTransaction(fixture, kind, points);
    const result = await transactions();
    expect(result?.transactions.totalCount).toBe(cases.length);
    expect(result?.transactions.nodes.map(({ node }: any) => [node.type, node.direction]))
      .toEqual(expect.arrayContaining(cases.map(([, , type, direction]) => [type, direction])));
  });

  test('hides activation reservation release merge and debt-recovery internals', async () => {
    const fixture = await kit.createActiveAccount();
    for (const kind of ['ACTIVATE', 'RESERVE', 'RELEASE', 'MERGE_TRANSFER', 'DEBT_RECOVERY']) {
      await kit.seedTransaction(fixture, kind, 1n);
    }
    expect((await transactions())?.transactions).toMatchObject({ totalCount: 0, nodes: [] });
  });

  test('orders transactions newest first with a stable tie-breaker', async () => {
    const fixture = await kit.createActiveAccount();
    const occurredAt = new Date().toISOString();
    await Promise.all([
      kit.seedTransaction(fixture, 'ADJUST_CREDIT', 1n, { occurredAt }),
      kit.seedTransaction(fixture, 'ADJUST_CREDIT', 2n, { occurredAt }),
      kit.seedTransaction(fixture, 'ADJUST_CREDIT', 3n, { occurredAt }),
    ]);
    const first = await transactions();
    const repeated = await transactions();
    expect(first?.transactions.nodes.map(({ node }: any) => node.id))
      .toEqual(repeated?.transactions.nodes.map(({ node }: any) => node.id));
  });

  test('paginates transaction history without gaps or duplicates', async () => {
    const fixture = await kit.createActiveAccount();
    for (let index = 0; index < 5; index += 1) {
      await kit.seedTransaction(fixture, 'ADJUST_CREDIT', BigInt(index + 1), {
        occurredAt: new Date(Date.now() + index * 1000).toISOString(),
      });
    }
    const first = await transactions(2);
    const second = await transactions(2, first?.transactions.pageInfo.endCursor);
    const third = await transactions(2, second?.transactions.pageInfo.endCursor);
    const ids = [first, second, third].flatMap((page) => page?.transactions.nodes.map(({ node }: any) => node.id) ?? []);
    expect(new Set(ids).size).toBe(5);
    expect(first?.transactions).toMatchObject({ totalCount: 5, pageInfo: { hasNextPage: true } });
    expect(third?.transactions.pageInfo.hasNextPage).toBe(false);
  });

  test('returns absolute point amounts and correct credit or debit direction', async () => {
    const fixture = await kit.createActiveAccount();
    await kit.seedTransaction(fixture, 'ADJUST_DEBIT', -42n, { metadata: {} });
    await kit.seedTransaction(fixture, 'ADJUST_CREDIT', 9007199254740993n, {
      metadata: { points: '9007199254740993' },
    });
    const nodes = (await transactions())?.transactions.nodes.map(({ node }: any) => node);
    expect(nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ points: '42', direction: 'DEBIT' }),
      expect.objectContaining({ points: '9007199254740993', direction: 'CREDIT' }),
    ]));
  });

  test('returns descriptions and expiry dates only when customer safe', async () => {
    const fixture = await kit.createActiveAccount();
    const expiresAt = new Date(Date.now() + 86_400_000).toISOString();
    await kit.seedTransaction(fixture, 'EARN_PENDING', 3n, {
      description: 'Welcome points', metadata: { points: '3', expiresAt, secret: 'hidden' },
    });
    const node = (await transactions())?.transactions.nodes[0].node;
    expect(node).toMatchObject({ description: 'Welcome points', expiresAt });
    expect(JSON.stringify(node)).not.toMatch(/reasonCode|actorId|secret/);
  });

  test('cannot resolve another customer transaction by an opaque node reference', async () => {
    const fixture = await kit.createActiveAccount();
    const id = await kit.seedTransaction(fixture, 'ADJUST_CREDIT', 1n);
    const response = await kit.graphql<{ node: unknown }>(
      `query TransactionNode($id: ID!) { node(id: $id) { id } }`,
      { id },
      { accessToken: null },
    );
    expect(response.data?.node ?? null).toBeNull();
    expect(JSON.stringify(response)).not.toMatch(/points|metadata|reasonCode/);
  });

  test('rejects invalid pagination arguments and cursors', async () => {
    await kit.createActiveAccount();
    for (const args of ['first: 0', 'first: -1', 'first: 101', 'first: 2, after: "not-a-cursor"']) {
      const response = await kit.loyaltyAccountResponse(`transactions(${args}) { totalCount }`);
      expect(response.errors?.[0]?.message).toEqual(expect.any(String));
    }
  });
});
