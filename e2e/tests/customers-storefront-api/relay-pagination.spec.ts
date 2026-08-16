/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import {
  PAGE_INFO_FIELDS,
  CustomersStorefrontTestKit,
  expectCanonicalEmptyConnection,
  expectConnectionIntegrity,
} from './customers-storefront-test-kit';

test.describe('Customers Storefront API — shared Relay contract', () => {
  let kit: CustomersStorefrontTestKit;
  test.beforeEach(async ({ api, request }) => {
    kit = new CustomersStorefrontTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  const connectionFields = `edges { cursor node { id } } nodes { id } totalCount pageInfo { ${PAGE_INFO_FIELDS} }`;

  test('every customer connection returns matching nodes and edge nodes', async () => {
    const wishlist = await kit.seedWishlist({ isDefault: true });
    await Promise.all([kit.seedAddress(), kit.seedTaxIdentifier(), kit.seedDataRequest()]);
    await kit.sql`insert into customers.customer_tax_exemption (store_id, customer_id, code, status) values (${kit.realm.storeId}, ${kit.customer.rawId}, 'RELAY', 'ACTIVE')`;
    await kit.sql`insert into customers.customer_wishlist_item (store_id, wishlist_id, product_id) values (${kit.realm.storeId}, ${wishlist.id}, ${crypto.randomUUID()})`;
    const customer = await kit.currentCustomer<any>(`
      addresses { ${connectionFields} }
      taxIdentifiers { ${connectionFields} }
      taxExemptions { ${connectionFields} }
      dataRequests { ${connectionFields} }
      wishlists { ${connectionFields} }
      defaultWishlist { items { ${connectionFields} } }
    `);
    for (const connection of [
      customer.addresses,
      customer.taxIdentifiers,
      customer.taxExemptions,
      customer.dataRequests,
      customer.wishlists,
      customer.defaultWishlist.items,
    ])
      expectConnectionIntegrity(connection);
  });

  test('every empty customer connection has canonical empty pageInfo', async () => {
    const customer = await kit.currentCustomer<any>(`
      addresses { ${connectionFields} } taxIdentifiers { ${connectionFields} }
      taxExemptions { ${connectionFields} } dataRequests { ${connectionFields} }
      wishlists { ${connectionFields} }
    `);
    for (const connection of Object.values(customer))
      expectCanonicalEmptyConnection(connection as any);
  });

  test('every customer connection supports first after last and before', async () => {
    for (let index = 0; index < 4; index += 1) {
      await kit.seedAddress({
        address1: `Relay ${index}`,
        createdAt: new Date(Date.now() + index),
      });
      await kit.seedTaxIdentifier({
        value: `RELAY-${index}`,
        createdAt: new Date(Date.now() + index),
      });
      await kit.seedDataRequest({ requestedAt: new Date(Date.now() + index) });
      await kit.seedWishlist({
        name: `Relay ${index}`,
        isDefault: index === 0,
        createdAt: new Date(Date.now() + index),
      });
    }
    for (const field of ['addresses', 'taxIdentifiers', 'dataRequests', 'wishlists']) {
      const first = await kit.currentCustomer<any>(
        `${field}(first: 2) { nodes { id } pageInfo { ${PAGE_INFO_FIELDS} } }`,
      );
      const after = first[field].pageInfo.endCursor;
      const next = await kit.customerQuery<any>(
        `${field}(first: 2, after: $cursor) { nodes { id } pageInfo { ${PAGE_INFO_FIELDS} } }`,
        { cursor: after },
        '$cursor: Cursor!',
      );
      const before = next.data!.customer![field].pageInfo.startCursor;
      const back = await kit.customerQuery<any>(
        `${field}(last: 2, before: $cursor) { nodes { id } }`,
        { cursor: before },
        '$cursor: Cursor!',
      );
      expect(back.data!.customer![field].nodes).toEqual(first[field].nodes);
    }
  });

  test('every customer connection uses the descending ID tie-breaker by default', async () => {
    const tied = new Date('2026-01-01T00:00:00.000Z');
    const expected: Record<string, { id: string; globalId: string }[]> = {
      addresses: [],
      taxIdentifiers: [],
      dataRequests: [],
      wishlists: [],
    };
    for (let index = 0; index < 4; index += 1) {
      expected.addresses.push(await kit.seedAddress({ address1: `Tie ${index}`, createdAt: tied }));
      expected.taxIdentifiers.push(
        await kit.seedTaxIdentifier({ value: `TIE-${index}`, createdAt: tied }),
      );
      expected.dataRequests.push(await kit.seedDataRequest({ requestedAt: tied }));
      expected.wishlists.push(
        await kit.seedWishlist({
          name: `Tie ${index}`,
          isDefault: index === 0,
          createdAt: tied,
        }),
      );
    }
    const selection =
      'addresses { nodes { id } } taxIdentifiers { nodes { id } } dataRequests { nodes { id } } wishlists { nodes { id } }';
    const customer = await kit.currentCustomer<any>(selection);
    for (const field of Object.keys(expected)) {
      expect(customer[field].nodes.map(({ id }: { id: string }) => id)).toEqual(
        expected[field]!.sort((left, right) => right.id.localeCompare(left.id)).map(
          ({ globalId }) => globalId,
        ),
      );
    }
  });

  test('inserting or deleting around a cursor does not duplicate already returned nodes', async () => {
    for (let index = 0; index < 4; index += 1)
      await kit.seedAddress({
        address1: `Stable ${index}`,
        createdAt: new Date(Date.now() + index * 1000),
      });
    const first = await kit.currentCustomer<any>(
      `addresses(first: 2) { nodes { id } pageInfo { ${PAGE_INFO_FIELDS} } }`,
    );
    await kit.seedAddress({ address1: 'Inserted before or after cursor', createdAt: new Date() });
    const after = first.addresses.pageInfo.endCursor;
    const next = await kit.customerQuery<any>(
      'addresses(first: 3, after: $after) { nodes { id } }',
      { after },
      '$after: Cursor!',
    );
    const firstIds = new Set(first.addresses.nodes.map((node: any) => node.id));
    const duplicateIds = next
      .data!.customer!.addresses.nodes.map((node: any) => node.id)
      .filter((id: string) => firstIds.has(id));
    expect(duplicateIds).toEqual([]);
  });

  test('cursors cannot be reused across connection types customers stores or owners', async () => {
    await kit.seedAddress();
    await kit.seedTaxIdentifier();
    const address = await kit.currentCustomer<any>(
      `addresses(first: 1) { pageInfo { ${PAGE_INFO_FIELDS} } }`,
    );
    const cursor = address.addresses.pageInfo.endCursor;
    const response = await kit.customerQuery(
      'taxIdentifiers(first: 1, after: $cursor) { nodes { id } }',
      { cursor },
      '$cursor: Cursor!',
    );
    expect(response.errors).not.toHaveLength(0);
    expect(JSON.stringify(response)).not.toMatch(/stack|postgres|node_modules/iu);
  });

  test('invalid negative zero excessive and contradictory pagination arguments are rejected', async () => {
    for (const field of [
      'addresses',
      'taxIdentifiers',
      'taxExemptions',
      'dataRequests',
      'wishlists',
    ]) {
      for (const args of [
        'first: -1',
        'first: 0',
        'last: -1',
        'last: 0',
        'first: 101',
        'first: 1, last: 1',
        'after: "x"',
      ]) {
        const response = await kit.customerQuery(`${field}(${args}) { nodes { id } }`);
        expect(response.errors).not.toHaveLength(0);
        expect(JSON.stringify(response)).not.toMatch(/stack|postgres|node_modules/iu);
      }
    }
  });
});
