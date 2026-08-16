/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  createCustomer,
  createGroup,
  createSegment,
  createTag,
  deleteCustomer,
  expectNoUserErrors,
  expectUserError,
  getCustomer,
  missingId,
  setupStore,
  updateCustomer,
  wrongTypeId,
} from './helpers';

test.describe('Customers Admin API - customer delete', () => {
  test.beforeEach(async ({ api }) => {
    await setupStore(api);
  });

  test('admin deletes a guest customer with no dependencies', async ({ api }) => {
    const customer = await createCustomer(api);
    const payload = await deleteCustomer(api, customer.id);
    expectNoUserErrors(payload);
    expect(payload.deletedCustomerId).toBe(customer.id);
    expect(await getCustomer(api, customer.id)).toBeNull();
  });

  test('customer delete cascades or tombstones all owned entities consistently', async ({
    api,
  }) => {
    let customer = await createCustomer(api, { email: 'owned@playwright.dev' });
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
    const childIds = [
      customer.addresses.edges[0].node.id,
      customer.consents[0].id,
      customer.taxIdentifiers.edges[0].node.id,
      customer.taxExemptions.edges[0].node.id,
      customer.groupMemberships.edges[0].node.id,
      customer.tagAssignments.edges[0].node.id,
      customer.segmentMemberships.edges[0].node.id,
    ];
    expectNoUserErrors(await deleteCustomer(api, customer.id));
    const nodes = await api.admin.query<any>('customers-admin-api/Nodes', {
      variables: { ids: childIds },
    });
    expect(nodes.data.customersQuery.nodes).toEqual(childIds.map(() => null));
  });

  test('customer delete with matching expected revision succeeds', async ({ api }) => {
    const customer = await createCustomer(api);
    const payload = await deleteCustomer(api, customer.id, customer.revision);
    expectNoUserErrors(payload);
    expect(payload.deletedCustomerId).toBe(customer.id);
  });

  test('customer delete with stale expected revision fails', async ({ api }) => {
    const customer = await createCustomer(api);
    const updated = await updateCustomer(api, customer, { profile: { firstName: 'Updated' } });
    const payload = await deleteCustomer(api, customer.id, customer.revision);
    expectUserError(payload, 'REVISION_CONFLICT');
    expect((await getCustomer(api, customer.id)).revision).toBe(updated.customer.revision);
  });

  test('customer delete without optional expected revision uses the current aggregate state', async ({
    api,
  }) => {
    const customer = await createCustomer(api);
    const updated = await updateCustomer(api, customer, { profile: { firstName: 'Updated' } });
    const payload = await deleteCustomer(api, updated.customer.id);
    expectNoUserErrors(payload);
    expect(payload.deletedCustomerId).toBe(customer.id);
  });

  test('deleting missing malformed foreign-type or cross-store customer is safe', async ({
    api,
  }) => {
    for (const id of [missingId(), 'malformed', wrongTypeId()]) {
      const payload = await deleteCustomer(api, id);
      expect(payload.userErrors.length).toBeGreaterThan(0);
    }
    const foreign = await createCustomer(api);
    await api.session.setupProject();
    const payload = await deleteCustomer(api, foreign.id);
    expectUserError(payload, 'NOT_FOUND');
  });

  test('deleting a blocked customer succeeds and returns its ID', async ({ api }) => {
    const blocked = await createCustomer(api);
    const blockedUpdate = await updateCustomer(api, blocked, {
      status: { status: 'BLOCKED', blockedReason: 'risk' },
    });
    const result = await deleteCustomer(api, blocked.id, blockedUpdate.customer.revision);
    expectNoUserErrors(result);
    expect(result.deletedCustomerId).toBe(blocked.id);
    expect(await getCustomer(api, blocked.id)).toBeNull();
    expect(JSON.stringify(result)).not.toMatch(/password|token|secret/iu);
  });

  test('repeated customer delete is deterministic and does not duplicate side effects', async ({
    api,
  }) => {
    const customer = await createCustomer(api);
    const first = await deleteCustomer(api, customer.id);
    const retry = await deleteCustomer(api, customer.id);
    expectNoUserErrors(first);
    expect(retry.deletedCustomerId).toBeNull();
    expectUserError(retry, 'NOT_FOUND');
  });
});
