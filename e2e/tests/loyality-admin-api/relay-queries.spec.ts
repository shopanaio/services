/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { composeGlobalId } from '@utils/globalid';
import { createDraft, createProgram, seedAccount, setupStore } from './helpers';

test.describe('Loyalty Admin API Relay and query surfaces', () => {
  test.beforeEach(async ({ api }) => setupStore(api));

  test('resolves loyalty entity types by global ID', async ({ api }) => {
    const { program, version } = await createDraft(api);
    const account = await seedAccount(api, program);
    for (const [id, type] of [[program.id, 'LoyaltyProgram'], [version.id, 'LoyaltyProgramVersion'], [account.id, 'LoyaltyAccount']] as const) {
      const result = await api.admin.query<any>('loyality-admin-api/Node', { variables: { id } });
      expect(result.data.loyaltyQuery.node).toEqual({ id, __typename: type });
    }
  });

  test('resolves mixed nodes in input order with duplicates and null missing nodes', async ({ api }) => {
    const { program, version } = await createDraft(api);
    const missing = composeGlobalId('LoyaltyProgram', crypto.randomUUID());
    const ids = [version.id, program.id, program.id, missing];
    const result = await api.admin.query<any>('loyality-admin-api/Nodes', { variables: { ids } });
    expect(result.data.loyaltyQuery.nodes).toEqual([
      { id: version.id, __typename: 'LoyaltyProgramVersion' },
      { id: program.id, __typename: 'LoyaltyProgram' },
      { id: program.id, __typename: 'LoyaltyProgram' },
      null,
    ]);
  });

  test('paginates programs forward and backward without gaps or duplicates', async ({ api }) => {
    const ids = [];
    for (let index = 0; index < 5; index += 1) ids.push((await createProgram(api, { name: `Relay ${index}` })).id);
    const first = await api.admin.query<any>('loyality-admin-api/Programs', { variables: { first: 2 } });
    const firstConnection = first.data.loyaltyQuery.programs;
    expect(firstConnection).toMatchObject({ totalCount: 5, pageInfo: { hasNextPage: true, hasPreviousPage: false } });
    const second = await api.admin.query<any>('loyality-admin-api/Programs', { variables: { first: 3, after: firstConnection.pageInfo.endCursor } });
    const seen = [...firstConnection.edges, ...second.data.loyaltyQuery.programs.edges].map(({ node }: any) => node.id);
    expect(new Set(seen).size).toBe(5);
    expect(seen).toEqual(expect.arrayContaining(ids));
    const backward = await api.admin.query<any>('loyality-admin-api/Programs', { variables: { last: 2, before: second.data.loyaltyQuery.programs.pageInfo.endCursor } });
    expect(backward.data.loyaltyQuery.programs.edges).toHaveLength(2);
  });

  test('filters programs by ids status default flag and search', async ({ api }) => {
    const match = await createProgram(api, { name: 'Needle Rewards', isDefault: true });
    await createProgram(api, { name: 'Other Rewards' });
    const result = await api.admin.query<any>('loyality-admin-api/Programs', { variables: { first: 20, where: { ids: [match.id], statuses: ['DRAFT'], isDefault: true, search: 'needle' } } });
    expect(result.data.loyaltyQuery.programs).toMatchObject({ totalCount: 1, edges: [{ node: { id: match.id } }] });
  });

  test('isolates direct and connection reads by active store', async ({ api }) => {
    const foreign = await createProgram(api);
    await api.session.setupProject({ displayName: 'Second store', currencyCode: 'USD' });
    const direct = await api.admin.query<any>('loyality-admin-api/Program', { variables: { id: foreign.id } });
    expect(direct.data.loyaltyQuery.program).toBeNull();
    const connection = await api.admin.query<any>('loyality-admin-api/Programs', { variables: { first: 20, where: { ids: [foreign.id] } } });
    expect(connection.data.loyaltyQuery.programs.totalCount).toBe(0);
  });

  test('rejects malformed IDs and invalid pagination arguments safely', async ({ api }) => {
    for (const variables of [{ first: -1 }, { first: 1, last: 1 }, { first: 1, after: 'not-a-cursor' }]) {
      const result = await api.admin.query<any>('loyality-admin-api/Programs', { throwOnError: false, variables });
      expect(result.errors?.length || 0).toBeGreaterThan(0);
    }
    const malformed = await api.admin.query<any>('loyality-admin-api/Node', { throwOnError: false, variables: { id: 'not-a-global-id' } });
    expect(malformed.errors?.length || 0).toBeGreaterThan(0);
  });
});
