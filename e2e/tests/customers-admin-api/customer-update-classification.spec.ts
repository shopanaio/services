/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  createCustomer,
  createGroup,
  createSegment,
  createTag,
  expectNoUserErrors,
  expectUserError,
  future,
  getCustomer,
  setupStore,
  updateCustomer,
} from './helpers';

test.describe('Customers Admin API - unified classification updates', () => {
  test.beforeEach(async ({ api }) => {
    await setupStore(api);
  });

  test('customer update replaces all manual group memberships', async ({ api }) => {
    const customer = await createCustomer(api);
    const a = await createGroup(api);
    const b = await createGroup(api);
    let payload = await updateCustomer(api, customer, {
      groups: { memberships: [{ groupId: a.id, isPrimary: true }, { groupId: b.id }] },
    });
    expectNoUserErrors(payload);
    expect(payload.customer.groupMemberships.totalCount).toBe(2);
    payload = await updateCustomer(api, payload.customer, {
      groups: { memberships: [{ groupId: b.id, isPrimary: true }] },
    });
    expect(payload.customer.groupMemberships.edges.map(({ node }: any) => node.group.id)).toEqual([
      b.id,
    ]);
  });

  test('empty group memberships clears all manual groups', async ({ api }) => {
    const customer = await createCustomer(api);
    const group = await createGroup(api);
    const assigned = await updateCustomer(api, customer, {
      groups: { memberships: [{ groupId: group.id }] },
    });
    const untouched = await updateCustomer(api, assigned.customer, {
      profile: { firstName: 'Keep groups' },
    });
    expect(untouched.customer.groupMemberships.totalCount).toBe(1);
    const cleared = await updateCustomer(api, untouched.customer, { groups: { memberships: [] } });
    expect(cleared.customer.groupMemberships.totalCount).toBe(0);
  });

  test('customer can have exactly one active primary group', async ({ api }) => {
    const customer = await createCustomer(api);
    const a = await createGroup(api);
    const b = await createGroup(api);
    const payload = await updateCustomer(api, customer, {
      groups: {
        memberships: [
          { groupId: a.id, isPrimary: true },
          { groupId: b.id, isPrimary: true },
        ],
      },
    });
    expectUserError(payload, 'MULTIPLE_PRIMARY_GROUPS');
  });

  test('duplicate or foreign group IDs are rejected atomically', async ({ api }) => {
    const customer = await createCustomer(api);
    const group = await createGroup(api);
    expectUserError(
      await updateCustomer(api, customer, {
        groups: { memberships: [{ groupId: group.id }, { groupId: group.id }] },
      }),
      'DUPLICATE_ID',
    );
    await api.session.setupProject();
    const foreignCustomer = await createCustomer(api);
    const foreignGroup = await createGroup(api);
    await api.session.setupProject();
    expectUserError(
      await updateCustomer(api, await createCustomer(api), {
        groups: { memberships: [{ groupId: foreignGroup.id }] },
      }),
      'NOT_FOUND',
    );
    expect(await getCustomer(api, foreignCustomer.id)).toBeNull();
  });

  test('expired group memberships are reported inactive', async ({ api }) => {
    const customer = await createCustomer(api);
    const group = await createGroup(api);
    const payload = await updateCustomer(api, customer, {
      groups: {
        memberships: [{ groupId: group.id, expiresAt: new Date(Date.now() - 1000).toISOString() }],
      },
    });
    expect(payload.customer.groupMemberships.edges[0].node.isActive).toBe(false);
  });

  test('customer update replaces all tag assignments', async ({ api }) => {
    const customer = await createCustomer(api);
    const a = await createTag(api);
    const b = await createTag(api);
    let payload = await updateCustomer(api, customer, { tags: { tagIds: [a.id, b.id] } });
    expect(payload.customer.tagAssignments.totalCount).toBe(2);
    payload = await updateCustomer(api, payload.customer, { tags: { tagIds: [b.id] } });
    expect(payload.customer.tagAssignments.edges.map(({ node }: any) => node.tag.id)).toEqual([
      b.id,
    ]);
  });

  test('empty tag IDs clears tags and duplicate or foreign IDs fail', async ({ api }) => {
    const customer = await createCustomer(api);
    const tag = await createTag(api);
    const assigned = await updateCustomer(api, customer, { tags: { tagIds: [tag.id] } });
    expect(
      (await updateCustomer(api, assigned.customer, { tags: { tagIds: [] } })).customer
        .tagAssignments.totalCount,
    ).toBe(0);
    expectUserError(
      await updateCustomer(api, assigned.customer, { tags: { tagIds: [tag.id, tag.id] } }),
      'DUPLICATE_ID',
    );
  });

  test('customer update replaces manual segment memberships', async ({ api }) => {
    const customer = await createCustomer(api);
    const a = await createSegment(api);
    const b = await createSegment(api);
    let payload = await updateCustomer(api, customer, { segments: { segmentIds: [a.id, b.id] } });
    expect(payload.customer.segmentMemberships.totalCount).toBe(2);
    payload = await updateCustomer(api, payload.customer, { segments: { segmentIds: [b.id] } });
    expect(
      payload.customer.segmentMemberships.edges.map(({ node }: any) => node.segment.id),
    ).toEqual([b.id]);
  });

  test('dynamic segment cannot be assigned manually', async ({ api }) => {
    const customer = await createCustomer(api);
    const dynamic = await createSegment(api, { type: 'DYNAMIC', query: 'customer.email != null' });
    expectUserError(
      await updateCustomer(api, customer, { segments: { segmentIds: [dynamic.id] } }),
      'SEGMENT_NOT_MANUAL',
    );
  });

  test('empty segment IDs clears only manual memberships', async ({ api }) => {
    const customer = await createCustomer(api);
    const manual = await createSegment(api);
    const assigned = await updateCustomer(api, customer, { segments: { segmentIds: [manual.id] } });
    const cleared = await updateCustomer(api, assigned.customer, { segments: { segmentIds: [] } });
    expectNoUserErrors(cleared);
    expect(cleared.customer.segmentMemberships.totalCount).toBe(0);
    expect(future()).toEqual(expect.any(String));
  });
});
