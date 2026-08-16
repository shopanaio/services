/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  createCustomer,
  createGroup,
  createSegment,
  createTag,
  getCustomer,
  missingId,
  setupStore,
  updateCustomer,
} from './helpers';

test.describe('Customers Admin API - Relay nodes', () => {
  test.beforeEach(async ({ api }) => {
    await setupStore(api);
  });

  test('node resolves every supported customer entity type', async ({ api }) => {
    let customer = await createCustomer(api, { email: 'nodes@playwright.dev' });
    const group = await createGroup(api);
    const tag = await createTag(api);
    const segment = await createSegment(api);
    customer = (
      await updateCustomer(api, customer, {
        addresses: { create: [{ address1: 'A', city: 'A', countryCode: 'US' }] },
        consents: {
          set: [{ channel: 'EMAIL', state: 'SUBSCRIBED', contactPoint: customer.email }],
        },
        taxIdentifiers: { create: [{ identifierType: 'VAT', value: 'A' }] },
        taxExemptions: { create: [{ code: 'A' }] },
        groups: { memberships: [{ groupId: group.id }] },
        tags: { tagIds: [tag.id] },
        segments: { segmentIds: [segment.id] },
      })
    ).customer;
    const full = await getCustomer(api, customer.id);
    const ids = [
      customer.id,
      customer.addresses.edges[0].node.id,
      customer.consents[0].id,
      full.consents[0].events.edges[0].node.id,
      customer.taxIdentifiers.edges[0].node.id,
      customer.taxExemptions.edges[0].node.id,
      group.id,
      customer.groupMemberships.edges[0].node.id,
      tag.id,
      customer.tagAssignments.edges[0].node.id,
      segment.id,
      customer.segmentMemberships.edges[0].node.id,
    ];
    const { data } = await api.admin.query<any>('customers-admin-api/Nodes', {
      variables: { ids },
    });
    expect(data.customersQuery.nodes.map((node: any) => node?.id)).toEqual(ids);
  });

  test('nodes preserves input order and duplicate IDs', async ({ api }) => {
    const left = await createCustomer(api);
    const right = await createCustomer(api);
    const ids = [right.id, left.id, right.id, left.id];
    const { data } = await api.admin.query<any>('customers-admin-api/Nodes', {
      variables: { ids },
    });
    expect(data.customersQuery.nodes.map((node: any) => node?.id)).toEqual(ids);
  });

  test('nodes returns null placeholders for missing malformed foreign and unsupported IDs', async ({
    api,
  }) => {
    await createCustomer(api);
    const foreign = await createCustomer(api);
    await api.session.setupProject();
    const valid = await createCustomer(api);
    const ids = [valid.id, missingId(), 'malformed', foreign.id, missingId('Product')];
    const { data } = await api.admin.query<any>('customers-admin-api/Nodes', {
      variables: { ids },
    });
    expect(data.customersQuery.nodes).toEqual([
      { __typename: 'Customer', id: valid.id },
      null,
      null,
      null,
      null,
    ]);
  });

  test('node does not resolve an entity from another store', async ({ api }) => {
    const customer = await createCustomer(api);
    await api.session.setupProject();
    const { data } = await api.admin.query<any>('customers-admin-api/Node', {
      variables: { id: customer.id },
    });
    expect(data.customersQuery.node).toBeNull();
  });
});
