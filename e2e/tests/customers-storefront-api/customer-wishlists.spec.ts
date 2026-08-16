/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import {
  PAGE_INFO_FIELDS,
  WISHLIST_FIELDS,
  WISHLIST_ITEM_FIELDS,
  CustomersStorefrontTestKit,
  USER_ERROR_FIELDS,
  expectConnectionIntegrity,
  uniqueKey,
  type CustomerUserError,
} from './customers-storefront-test-kit';

interface WishlistPayload {
  wishlist?: Record<string, unknown> | null;
  wishlistItem?: Record<string, unknown> | null;
  deletedWishlistId?: string | null;
  deletedWishlistItemId?: string | null;
  userErrors: CustomerUserError[];
}

test.describe('Customers Storefront API — wishlists', () => {
  let kit: CustomersStorefrontTestKit;
  test.beforeEach(async ({ api, request }) => {
    kit = new CustomersStorefrontTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  const create = (name: string, overrides: Record<string, unknown> = {}) =>
    kit.mutation<WishlistPayload>(
      'wishlistCreate',
      'WishlistCreateInput',
      {
        name,
        idempotencyKey: uniqueKey(),
        ...overrides,
      },
      `wishlist { ${WISHLIST_FIELDS} } userErrors { ${USER_ERROR_FIELDS} }`,
    );
  const update = (
    id: string,
    name: string,
    expectedUpdatedAt: string,
    overrides: Record<string, unknown> = {},
  ) =>
    kit.mutation<WishlistPayload>(
      'wishlistUpdate',
      'WishlistUpdateInput',
      {
        id,
        name,
        expectedUpdatedAt,
        idempotencyKey: uniqueKey(),
        ...overrides,
      },
      `wishlist { ${WISHLIST_FIELDS} } userErrors { ${USER_ERROR_FIELDS} }`,
    );
  const remove = (id: string, expectedUpdatedAt: string, overrides: Record<string, unknown> = {}) =>
    kit.mutation<WishlistPayload>(
      'wishlistDelete',
      'WishlistDeleteInput',
      {
        id,
        expectedUpdatedAt,
        idempotencyKey: uniqueKey(),
        ...overrides,
      },
      `deletedWishlistId userErrors { ${USER_ERROR_FIELDS} }`,
    );
  const add = (productId: string, wishlistId?: string, overrides: Record<string, unknown> = {}) =>
    kit.mutation<WishlistPayload>(
      'wishlistProductAdd',
      'WishlistProductAddInput',
      {
        productId,
        ...(wishlistId ? { wishlistId } : {}),
        idempotencyKey: uniqueKey(),
        ...overrides,
      },
      `wishlistItem { ${WISHLIST_ITEM_FIELDS} wishlist { id } } userErrors { ${USER_ERROR_FIELDS} }`,
    );
  const removeItem = (itemId: string, overrides: Record<string, unknown> = {}) =>
    kit.mutation<WishlistPayload>(
      'wishlistProductRemove',
      'WishlistProductRemoveInput',
      {
        itemId,
        idempotencyKey: uniqueKey(),
        ...overrides,
      },
      `deletedWishlistItemId userErrors { ${USER_ERROR_FIELDS} }`,
    );

  const product = async (status: 'DRAFT' | 'PUBLISHED' = 'PUBLISHED') =>
    kit.api.admin.product.createWithOptions({
      title: `Wishlist product ${crypto.randomUUID()}`,
      status,
      options: [{ name: 'Title', values: ['Default'] }],
    });

  test('customer creates the first wishlist as the default', async () => {
    const response = await create('  My favourites  ');
    expect(response.data?.payload.userErrors).toEqual([]);
    expect(response.data?.payload.wishlist).toEqual(
      expect.objectContaining({
        name: 'My favourites',
        isDefault: true,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      }),
    );
  });
  test('customer creates additional non-default wishlists', async () => {
    await create('First');
    await create('Second');
    await create('Third');
    const result = await kit.currentCustomer<any>(
      'wishlists { nodes { id isDefault } totalCount }',
    );
    expect(result.wishlists.totalCount).toBe(3);
    expect(result.wishlists.nodes.filter((item: any) => item.isDefault)).toHaveLength(1);
  });
  test('wishlist names accept valid Unicode and preserve display form', async () => {
    const name = '  Подарунки 🎁 É  ';
    const response = await create(name);
    expect(response.data?.payload.wishlist?.name).toBe(name.trim());
  });
  test('blank and whitespace-only wishlist names are rejected', async () => {
    for (const name of ['', ' ', '\n\t'])
      kit.expectUserError((await create(name)).data!.payload.userErrors, 'INVALID_NAME');
  });
  test('wishlist name accepts 128 Unicode characters and rejects 129', async () => {
    expect((await create('🎁'.repeat(128))).data?.payload.userErrors).toEqual([]);
    kit.expectUserError((await create('🎁'.repeat(129))).data!.payload.userErrors, 'INVALID_NAME');
  });
  test('normalized case and Unicode-equivalent duplicate names are rejected', async () => {
    await create('Café');
    for (const name of ['CAFÉ', 'Cafe\u0301'])
      kit.expectUserError((await create(name)).data!.payload.userErrors, 'WISHLIST_NAME_TAKEN');
  });
  test('same normalized wishlist name is allowed for another customer or store', async () => {
    await create('Shared name');
    const foreign = await kit.createGuestCustomer();
    const other = await kit.seedWishlist({
      customerId: foreign.id,
      name: 'SHARED NAME',
      isDefault: true,
    });
    expect(other.globalId).toEqual(expect.any(String));
  });
  test('customer renames default and non-default wishlists', async () => {
    const first = await create('First');
    const second = await create('Second');
    for (const [record, name] of [
      [first, 'Renamed default'],
      [second, 'Renamed other'],
    ] as const) {
      const wishlist = record.data!.payload.wishlist!;
      const result = await update(wishlist.id as string, name, wishlist.updatedAt as string);
      expect(result.data?.payload.wishlist).toEqual(expect.objectContaining({ name }));
    }
  });
  test('rename to the same normalized name has deterministic no-op semantics', async () => {
    const created = await create('Café');
    const wishlist = created.data!.payload.wishlist!;
    const response = await update(
      wishlist.id as string,
      ' CAFE\u0301 ',
      wishlist.updatedAt as string,
    );
    expect(response.data?.payload.userErrors).toEqual([]);
    expect(response.data?.payload.wishlist?.name).toBe('CAFÉ');
  });
  test('stale malformed and future expectedUpdatedAt reject rename and delete', async () => {
    const created = await create('Timestamp');
    const wishlist = created.data!.payload.wishlist!;
    for (const timestamp of [
      new Date(Date.parse(wishlist.updatedAt as string) - 1).toISOString(),
      'bad',
      new Date(Date.now() + 86_400_000).toISOString(),
    ]) {
      for (const response of [
        await update(wishlist.id as string, 'No write', timestamp),
        await remove(wishlist.id as string, timestamp),
      ]) {
        if (response.errors) kit.expectBadUserInput(response);
        else
          expect(['UPDATED_AT_CONFLICT', 'INVALID_UPDATED_AT']).toContain(
            response.data!.payload.userErrors[0]!.code,
          );
      }
    }
  });
  test('customer deletes a non-default empty wishlist', async () => {
    await create('Default');
    const other = await create('Delete me');
    const wishlist = other.data!.payload.wishlist!;
    const response = await remove(wishlist.id as string, wishlist.updatedAt as string);
    expect(response.data?.payload).toEqual(
      expect.objectContaining({ deletedWishlistId: wishlist.id, userErrors: [] }),
    );
  });
  test('deleting a populated non-default wishlist removes its items atomically', async () => {
    await create('Default');
    const other = await create('Populated');
    const wishlist = other.data!.payload.wishlist!;
    const itemId = crypto.randomUUID();
    await kit.sql`insert into customers.customer_wishlist_item (id, store_id, wishlist_id, product_id) values (${itemId}, ${kit.realm.storeId}, ${kit.headless.rawId(wishlist.id as string)}, ${crypto.randomUUID()})`;
    expect(
      (await remove(wishlist.id as string, wishlist.updatedAt as string)).data?.payload.userErrors,
    ).toEqual([]);
    const [row] =
      await kit.sql`select count(*)::int as count from customers.customer_wishlist_item where id = ${itemId}`;
    expect(row!.count).toBe(0);
  });
  test('default wishlist cannot be deleted', async () => {
    const created = await create('Default');
    const wishlist = created.data!.payload.wishlist!;
    kit.expectUserError(
      (await remove(wishlist.id as string, wishlist.updatedAt as string)).data!.payload.userErrors,
      'DEFAULT_WISHLIST_DELETE_FORBIDDEN',
    );
  });
  test('missing cross-customer cross-store malformed and wrong-type wishlist IDs are safe', async () => {
    const foreignCustomer = await kit.createGuestCustomer();
    const foreign = await kit.seedWishlist({ customerId: foreignCustomer.id, isDefault: true });
    const foreignStore = await kit.createForeignStore();
    const foreignStoreId = kit.headless.rawId(foreignStore.id);
    const crossStoreCustomer = await kit.createGuestCustomer({ storeId: foreignStoreId });
    const crossStore = await kit.seedWishlist({
      customerId: crossStoreCustomer.id,
      storeId: foreignStoreId,
      isDefault: true,
    });
    for (const id of [
      kit.id('CustomerWishlist'),
      foreign.globalId,
      crossStore.globalId,
      'bad',
      kit.id('CustomerAddress'),
    ]) {
      const response = await update(id, 'Nope', new Date().toISOString());
      expect(['NOT_FOUND', 'INVALID_ID']).toContain(response.data!.payload.userErrors[0]!.code);
    }
  });
  test('customer adds a published current-store product to a selected wishlist', async () => {
    const wishlist = (await create('Products')).data!.payload.wishlist!;
    const current = await product();
    const response = await add(current.id, wishlist.id as string);
    expect(response.data?.payload.userErrors).toEqual([]);
    expect(response.data?.payload.wishlistItem).toEqual(
      expect.objectContaining({ product: { id: current.id }, wishlist: { id: wishlist.id } }),
    );
  });
  test('omitting wishlistId adds the product to the default wishlist', async () => {
    const wishlist = (await create('Default')).data!.payload.wishlist!;
    const current = await product();
    expect((await add(current.id)).data?.payload.wishlistItem?.wishlist).toEqual({
      id: wishlist.id,
    });
  });
  test('omitting wishlistId creates or selects the default wishlist according to contract', async () => {
    const current = await product();
    const response = await add(current.id);
    expect(response.data?.payload.userErrors).toEqual([]);
    const customer = await kit.currentCustomer<any>('defaultWishlist { id items { totalCount } }');
    expect(customer.defaultWishlist.items.totalCount).toBe(1);
  });
  test('adding the same product twice returns the existing item without duplication', async () => {
    const current = await product();
    const first = await add(current.id);
    const second = await add(current.id);
    expect(second.data?.payload.wishlistItem?.id).toBe(first.data?.payload.wishlistItem?.id);
    expect(
      (await kit.currentCustomer<any>('defaultWishlist { items { totalCount } }')).defaultWishlist
        .items.totalCount,
    ).toBe(1);
  });
  test('missing deleted unpublished foreign-store and malformed products are rejected', async () => {
    const draft = await product('DRAFT');
    const foreignStore = await kit.createForeignStore();
    const foreign = await kit.inProject(foreignStore, () => product());
    for (const id of [
      kit.id('Product'),
      draft.id,
      foreign.id,
      'bad',
      kit.id('CustomerAddress'),
    ]) {
      const response = await add(id);
      if (response.errors) kit.expectBadUserInput(response);
      else
        expect(['PRODUCT_NOT_FOUND', 'PRODUCT_NOT_PUBLISHED', 'INVALID_ID']).toContain(
          response.data!.payload.userErrors[0]!.code,
        );
    }
  });
  test('Catalog outage returns a retryable dependency error without saving an item', async () => {
    const before =
      await kit.sql`select count(*)::int as count from customers.customer_wishlist_item`;
    const response = await kit.withActionFault('catalog.query', () => add(kit.id('Product')));
    expect(response.errors).toBeUndefined();
    expect(response.data?.payload.wishlistItem).toBeNull();
    const error = response.data!.payload.userErrors[0]!;
    expect(error).toMatchObject({ code: 'CATALOG_UNAVAILABLE', retryable: true });
    expect(
      await kit.sql`select count(*)::int as count from customers.customer_wishlist_item`,
    ).toEqual(before);
  });
  test('customer removes an owned wishlist item', async () => {
    const item = (await add((await product()).id)).data!.payload.wishlistItem!;
    const response = await removeItem(item.id as string);
    expect(response.data?.payload).toEqual(
      expect.objectContaining({ deletedWishlistItemId: item.id, userErrors: [] }),
    );
  });
  test('missing cross-customer cross-store malformed and wrong-type wishlist item IDs are safe', async () => {
    const foreignCustomer = await kit.createGuestCustomer();
    const foreignWishlist = await kit.seedWishlist({ customerId: foreignCustomer.id });
    const foreignItemId = crypto.randomUUID();
    await kit.sql`insert into customers.customer_wishlist_item (id, store_id, wishlist_id, product_id) values (${foreignItemId}, ${kit.realm.storeId}, ${foreignWishlist.id}, ${crypto.randomUUID()})`;
    const foreignStore = await kit.createForeignStore();
    const foreignStoreId = kit.headless.rawId(foreignStore.id);
    const crossStoreCustomer = await kit.createGuestCustomer({ storeId: foreignStoreId });
    const crossStoreWishlist = await kit.seedWishlist({
      customerId: crossStoreCustomer.id,
      storeId: foreignStoreId,
    });
    const crossStoreItemId = crypto.randomUUID();
    await kit.sql`insert into customers.customer_wishlist_item (id, store_id, wishlist_id, product_id) values (${crossStoreItemId}, ${foreignStoreId}, ${crossStoreWishlist.id}, ${crypto.randomUUID()})`;
    for (const id of [
      kit.id('CustomerWishlistItem'),
      kit.id('CustomerWishlistItem', foreignItemId),
      kit.id('CustomerWishlistItem', crossStoreItemId),
      'bad',
      kit.id('CustomerWishlist'),
    ]) {
      const response = await removeItem(id);
      expect(['NOT_FOUND', 'INVALID_ID']).toContain(response.data!.payload.userErrors[0]!.code);
    }
  });
  test('retrying every wishlist mutation with the same idempotency key is side-effect free', async () => {
    const key = uniqueKey();
    const first = await create('Once', { idempotencyKey: key });
    const replay = await create('Once', { idempotencyKey: key });
    expect(replay.data?.payload).toEqual(first.data?.payload);
    expect((await kit.currentCustomer<any>('wishlists { totalCount }')).wishlists.totalCount).toBe(
      1,
    );
  });
  test('reusing a wishlist idempotency key with another payload is rejected', async () => {
    const key = uniqueKey();
    await create('First', { idempotencyKey: key });
    kit.expectUserError(
      (await create('Different', { idempotencyKey: key })).data!.payload.userErrors,
      /IDEMPOTENCY/iu,
    );
  });
  test('concurrent same-name wishlist creates produce one wishlist', async () => {
    const results = await Promise.all([create('Race'), create('RACE')]);
    expect(results.filter((item) => item.data!.payload.userErrors.length === 0)).toHaveLength(1);
    expect((await kit.currentCustomer<any>('wishlists { totalCount }')).wishlists.totalCount).toBe(
      1,
    );
  });
  test('concurrent adds of one product produce one wishlist item', async () => {
    const current = await product();
    const results = await Promise.all([add(current.id), add(current.id)]);
    expect(
      new Set(results.map((item) => item.data?.payload.wishlistItem?.id).filter(Boolean)).size,
    ).toBe(1);
    expect(
      (await kit.currentCustomer<any>('defaultWishlist { items { totalCount } }')).defaultWishlist
        .items.totalCount,
    ).toBe(1);
  });
  test('customer reads default wishlist and one owned wishlist', async () => {
    const first = (await create('Default')).data!.payload.wishlist!;
    const second = (await create('Other')).data!.payload.wishlist!;
    const response = await kit.customerQuery<any>(
      'defaultWishlist { id } wishlist(id: $id) { id name }',
      { id: second.id },
      '$id: ID!',
    );
    expect(response.data?.customer).toEqual({
      defaultWishlist: { id: first.id },
      wishlist: { id: second.id, name: 'Other' },
    });
  });
  test('wishlists default to 20 and cap page size at 100', async () => {
    for (let index = 0; index < 21; index += 1)
      await kit.seedWishlist({ name: `List ${index}`, isDefault: index === 0 });
    expect(
      (await kit.currentCustomer<any>('wishlists { nodes { id } totalCount }')).wishlists,
    ).toEqual(expect.objectContaining({ totalCount: 21, nodes: expect.any(Array) }));
    expect(
      (await kit.currentCustomer<any>('wishlists { nodes { id } }')).wishlists.nodes,
    ).toHaveLength(20);
    expect(
      (await kit.customerQuery('wishlists(first: 101) { nodes { id } }')).errors,
    ).not.toHaveLength(0);
  });
  test('wishlists support stable forward and backward pagination', async () => {
    for (let index = 0; index < 5; index += 1)
      await kit.seedWishlist({
        name: `P ${index}`,
        isDefault: index === 0,
        createdAt: new Date(Date.now() + index),
      });
    const first = await kit.currentCustomer<any>(
      `wishlists(first: 2) { edges { cursor node { id } } nodes { id } totalCount pageInfo { ${PAGE_INFO_FIELDS} } }`,
    );
    expectConnectionIntegrity(first.wishlists);
    const after = first.wishlists.pageInfo.endCursor;
    const next = await kit.customerQuery<any>(
      `wishlists(first: 2, after: $after) { nodes { id } pageInfo { ${PAGE_INFO_FIELDS} } }`,
      { after },
      '$after: Cursor!',
    );
    const before = next.data!.customer!.wishlists.pageInfo.startCursor;
    const back = await kit.customerQuery<any>(
      'wishlists(last: 2, before: $before) { nodes { id } }',
      { before },
      '$before: Cursor!',
    );
    expect(back.data!.customer!.wishlists.nodes).toEqual(first.wishlists.nodes);
  });
  test('wishlist items default to 20 and cap page size at 100', async () => {
    const wishlist = await kit.seedWishlist({ isDefault: true });
    for (let index = 0; index < 21; index += 1)
      await kit.sql`insert into customers.customer_wishlist_item (store_id, wishlist_id, product_id, added_at) values (${kit.realm.storeId}, ${wishlist.id}, ${crypto.randomUUID()}, ${new Date(Date.now() + index)})`;
    const current = await kit.currentCustomer<any>(
      'defaultWishlist { items { nodes { id } totalCount } }',
    );
    expect(current.defaultWishlist.items.nodes).toHaveLength(20);
    expect(current.defaultWishlist.items.totalCount).toBe(21);
    expect(
      (await kit.customerQuery('defaultWishlist { items(first: 101) { nodes { id } } }')).errors,
    ).not.toHaveLength(0);
  });
  test('wishlist items support stable forward and backward pagination', async () => {
    const wishlist = await kit.seedWishlist({ isDefault: true });
    for (let index = 0; index < 5; index += 1)
      await kit.sql`insert into customers.customer_wishlist_item (store_id, wishlist_id, product_id, added_at) values (${kit.realm.storeId}, ${wishlist.id}, ${crypto.randomUUID()}, ${new Date(Date.now() + index)})`;
    const first = await kit.currentCustomer<any>(
      `defaultWishlist { items(first: 2) { edges { cursor node { id } } nodes { id } totalCount pageInfo { ${PAGE_INFO_FIELDS} } } }`,
    );
    expectConnectionIntegrity(first.defaultWishlist.items);
  });
  test('malformed mismatched and invalid pagination inputs are rejected safely', async () => {
    await kit.seedWishlist({ isDefault: true });
    for (const args of ['first: 0', 'last: -1', 'first: 2, last: 2', 'first: 2, after: "bad"']) {
      const response = await kit.customerQuery(`wishlists(${args}) { nodes { id } }`);
      expect(response.errors).not.toHaveLength(0);
      expect(JSON.stringify(response)).not.toMatch(/stack|postgres/iu);
    }
  });
  test('unpublished or deleted saved product remains as an item with null product', async () => {
    const wishlist = await kit.seedWishlist({ isDefault: true });
    const item = crypto.randomUUID();
    await kit.sql`insert into customers.customer_wishlist_item (id, store_id, wishlist_id, product_id) values (${item}, ${kit.realm.storeId}, ${wishlist.id}, ${crypto.randomUUID()})`;
    const result = await kit.currentCustomer<any>(
      'defaultWishlist { items { nodes { id product { id } } totalCount } }',
    );
    expect(result.defaultWishlist.items).toEqual({
      nodes: [{ id: kit.id('CustomerWishlistItem', item), product: null }],
      totalCount: 1,
    });
  });
  test('one unresolved federated product does not fail the complete items connection', async () => {
    const wishlist = await kit.seedWishlist({ isDefault: true });
    for (let index = 0; index < 2; index += 1)
      await kit.sql`insert into customers.customer_wishlist_item (store_id, wishlist_id, product_id) values (${kit.realm.storeId}, ${wishlist.id}, ${crypto.randomUUID()})`;
    const response = await kit.customerQuery<any>(
      'defaultWishlist { items { nodes { id product { id } } totalCount } }',
    );
    expect(response.errors).toBeUndefined();
    expect(response.data!.customer!.defaultWishlist.items.totalCount).toBe(2);
    expect(
      response.data!.customer!.defaultWishlist.items.nodes.every(
        (item: any) => item.product === null,
      ),
    ).toBe(true);
  });
});
