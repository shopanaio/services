/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import {
  CustomersStorefrontTestKit,
  USER_ERROR_FIELDS,
  uniqueKey,
  type CustomerUserError,
} from './customers-storefront-test-kit';

interface ComparisonPayload {
  customer: { id: string } | null;
  revision: number | null;
  userErrors: CustomerUserError[];
}

test.describe('Customers Storefront API — comparisons', () => {
  let kit: CustomersStorefrontTestKit;
  test.beforeEach(async ({ api, request }) => {
    kit = new CustomersStorefrontTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  const revision = async () => {
    const [row] = await kit.sql<
      { revision: number }[]
    >`select revision from customers.customer_comparison where customer_id = ${kit.customer.rawId}`;
    return row?.revision ?? 0;
  };
  const mutate = (field: string, type: string, input: Record<string, unknown>) =>
    kit.mutation<ComparisonPayload>(
      field,
      type,
      input,
      `customer { id } revision userErrors { ${USER_ERROR_FIELDS} }`,
    );
  const add = async (variantId: string, overrides: Record<string, unknown> = {}) =>
    mutate('customerComparisonVariantAdd', 'CustomerComparisonVariantAddInput', {
      variantId,
      expectedRevision: await revision(),
      idempotencyKey: uniqueKey(),
      ...overrides,
    });
  const remove = async (variantId: string, overrides: Record<string, unknown> = {}) =>
    mutate('customerComparisonVariantRemove', 'CustomerComparisonVariantRemoveInput', {
      variantId,
      expectedRevision: await revision(),
      idempotencyKey: uniqueKey(),
      ...overrides,
    });
  const clear = async (categoryId: string, overrides: Record<string, unknown> = {}) =>
    mutate('customerComparisonCategoryClear', 'CustomerComparisonCategoryClearInput', {
      categoryId,
      expectedRevision: await revision(),
      idempotencyKey: uniqueKey(),
      ...overrides,
    });
  const product = async (status: 'DRAFT' | 'PUBLISHED' = 'PUBLISHED') => {
    const current = await kit.api.admin.product.createWithOptions({
      title: `Compare ${crypto.randomUUID()}`,
      status,
      options: [{ name: 'Size', values: ['S', 'M'] }],
    });
    return {
      ...current,
      variants: {
        ...current.variants,
        edges: current.variants.edges.map((edge) => ({
          ...edge,
          node: {
            ...edge.node,
            id: kit.id('ProductVariant', kit.headless.rawId(edge.node.id)),
          },
        })),
      },
    };
  };

  test('customer adds a published concrete variant to comparisons', async () => {
    const current = await product();
    const variant = current.variants.edges[0]!.node;
    const response = await add(variant.id);
    expect(response.data?.payload).toEqual(
      expect.objectContaining({ customer: { id: kit.customer.id }, revision: 1, userErrors: [] }),
    );
    const [row] =
      await kit.sql`select position from customers.customer_comparison_item where variant_id = ${kit.headless.rawId(variant.id)}`;
    expect(row).toEqual({ position: 0 });
  });
  test('adding a second variant preserves deterministic selection order', async () => {
    const current = await product();
    const variants = current.variants.edges.map((edge) => edge.node);
    await add(variants[0]!.id);
    await add(variants[1]!.id);
    const rows =
      await kit.sql`select variant_id, position from customers.customer_comparison_item item join customers.customer_comparison comparison on comparison.id = item.comparison_id where comparison.customer_id = ${kit.customer.rawId} order by position`;
    expect(rows).toEqual([
      { variant_id: kit.headless.rawId(variants[0]!.id), position: 0 },
      { variant_id: kit.headless.rawId(variants[1]!.id), position: 1 },
    ]);
  });
  test('adding an already selected variant is idempotent', async () => {
    const variant = (await product()).variants.edges[0]!.node;
    const first = await add(variant.id);
    const replay = await add(variant.id);
    expect(replay.data?.payload.revision).toBe(first.data?.payload.revision);
    const [row] =
      await kit.sql`select count(*)::int as count from customers.customer_comparison_item where variant_id = ${kit.headless.rawId(variant.id)}`;
    expect(row!.count).toBe(1);
  });
  test('missing deleted unpublished parent-product foreign-store and malformed variants are rejected', async () => {
    const draft = await product('DRAFT');
    const foreignStore = await kit.createForeignStore();
    const foreign = await kit.inProject(foreignStore, () => product());
    for (const id of [
      kit.id('ProductVariant'),
      draft.variants.edges[0]!.node.id,
      foreign.variants.edges[0]!.node.id,
      'bad',
      kit.id('Product'),
    ]) {
      const response = await add(id);
      if (response.errors) kit.expectBadUserInput(response);
      else
        expect(['VARIANT_NOT_AVAILABLE', 'INVALID_ID']).toContain(
          response.data!.payload.userErrors[0]!.code,
        );
    }
  });
  test('customer removes a selected variant', async () => {
    const variant = (await product()).variants.edges[0]!.node;
    await add(variant.id);
    const before = await revision();
    const response = await remove(variant.id);
    expect(response.data?.payload).toEqual(
      expect.objectContaining({ revision: before + 1, userErrors: [] }),
    );
  });
  test('removing an unselected variant is rejected', async () => {
    const variant = (await product()).variants.edges[0]!.node;
    const before = await revision();
    const response = await remove(variant.id);
    kit.expectUserError(response.data!.payload.userErrors, 'VARIANT_NOT_SELECTED');
    expect(await revision()).toBe(before);
  });
  test('customer clears all selected variants in one category', async () => {
    const current = await product();
    const category = await createCategory();
    await kit.api.admin.mutation('category-api/CategoryAddProduct', {
      variables: {
        productId: current.id,
        categoryId: category.id,
        expectedRevision: current.revision,
      },
    });
    for (const edge of current.variants.edges) await add(edge.node.id);
    const response = await clear(category.id);
    expect(response.data?.payload.userErrors).toEqual([]);
    const [row] =
      await kit.sql`select count(*)::int as count from customers.customer_comparison_item item join customers.customer_comparison comparison on comparison.id = item.comparison_id where comparison.customer_id = ${kit.customer.rawId}`;
    expect(row!.count).toBe(0);
  });
  test('category clear also removes stale unpublished comparison variants', async () => {
    const current = await product();
    const category = await createCategory();
    await kit.api.admin.mutation('category-api/CategoryAddProduct', {
      variables: {
        productId: current.id,
        categoryId: category.id,
        expectedRevision: current.revision,
      },
    });
    const variant = current.variants.edges[0]!.node;
    await add(variant.id);
    await kit.sql`update catalog.product set published_at = null where id = ${kit.headless.rawId(current.id)}`;

    const response = await clear(category.id);

    expect(response.data?.payload.userErrors).toEqual([]);
    const [row] =
      await kit.sql`select count(*)::int as count from customers.customer_comparison_item where variant_id = ${kit.headless.rawId(variant.id)}`;
    expect(row!.count).toBe(0);
  });
  test('clearing an empty valid category has deterministic no-op semantics', async () => {
    const category = await createCategory();
    const before = await revision();
    const response = await clear(category.id);
    expect(response.data?.payload.userErrors).toEqual([]);
    expect(response.data?.payload.revision).toBe(before);
  });
  test('missing foreign-store and malformed category IDs are rejected', async () => {
    const foreignStore = await kit.createForeignStore();
    const foreign = await kit.inProject(foreignStore, () => createCategory());
    for (const id of [kit.id('Category'), foreign.id, 'bad', kit.id('Product')]) {
      const response = await clear(id);
      if (response.errors) kit.expectBadUserInput(response);
      else
        expect(['CATEGORY_NOT_FOUND', 'INVALID_ID']).toContain(
          response.data!.payload.userErrors[0]!.code,
        );
    }
  });
  test('stale expected revision rejects add remove and category clear', async () => {
    const current = await product();
    const variant = current.variants.edges[0]!.node;
    const category = await createCategory();
    await add(variant.id);
    const stale = Math.max(0, (await revision()) - 1);
    for (const response of await Promise.all([
      add(current.variants.edges[1]!.node.id, { expectedRevision: stale }),
      remove(variant.id, { expectedRevision: stale }),
      clear(category.id, { expectedRevision: stale }),
    ]))
      kit.expectUserError(response.data!.payload.userErrors, 'REVISION_CONFLICT', {
        retryable: true,
      });
  });
  test('non-positive fractional and unsafe comparison revisions are rejected', async () => {
    const variant = (await product()).variants.edges[0]!.node;
    for (const expectedRevision of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      const response = await add(variant.id, { expectedRevision });
      if (response.errors) kit.expectBadUserInput(response);
      else kit.expectUserError(response.data!.payload.userErrors, 'INVALID_REVISION');
    }
  });
  test('retrying each comparison mutation with the same idempotency key is side-effect free', async () => {
    const variant = (await product()).variants.edges[0]!.node;
    const input = { expectedRevision: 0, idempotencyKey: uniqueKey() };
    const first = await add(variant.id, input);
    const replay = await add(variant.id, input);
    expect(replay.data?.payload).toEqual(first.data?.payload);
    expect(await revision()).toBe(1);
  });
  test('reusing a comparison idempotency key with another payload is rejected', async () => {
    const variants = (await product()).variants.edges.map((edge) => edge.node);
    const key = uniqueKey();
    await add(variants[0]!.id, { idempotencyKey: key });
    kit.expectUserError(
      (await add(variants[1]!.id, { idempotencyKey: key, expectedRevision: 0 })).data!.payload
        .userErrors,
      /IDEMPOTENCY/iu,
    );
  });
  test('concurrent comparison writes with one revision allow exactly one winner', async () => {
    const variants = (await product()).variants.edges.map((edge) => edge.node);
    const expectedRevision = await revision();
    const results = await Promise.all([
      add(variants[0]!.id, { expectedRevision }),
      add(variants[1]!.id, { expectedRevision }),
    ]);
    expect(results.filter((item) => item.data!.payload.userErrors.length === 0)).toHaveLength(1);
    expect(
      results.filter((item) => item.data!.payload.userErrors[0]?.code === 'REVISION_CONFLICT'),
    ).toHaveLength(1);
  });
  test('Catalog outage is retryable and never changes persisted selection', async () => {
    const before = await revision();
    const response = await kit.withActionFault('catalog.resolveCustomerComparisonVariants', () =>
      add(kit.id('ProductVariant')),
    );
    expect(response.errors).toBeUndefined();
    const error = response.data!.payload.userErrors[0]!;
    expect(error).toMatchObject({ code: 'CATALOG_UNAVAILABLE', retryable: true });
    expect(await revision()).toBe(before);
    const [row] =
      await kit.sql`select count(*)::int as count from customers.customer_comparison_item where store_id = ${kit.realm.storeId} and comparison_id in (select id from customers.customer_comparison where customer_id = ${kit.customer.rawId})`;
    expect(row!.count).toBe(0);
  });
  test('comparison selection is isolated by customer and store', async () => {
    const current = await product();
    const variant = current.variants.edges[0]!.node;
    await add(variant.id);
    const foreign = await kit.createGuestCustomer();
    const [comparison] = await kit.sql<
      { id: string }[]
    >`insert into customers.customer_comparison (store_id, customer_id, revision) values (${kit.realm.storeId}, ${foreign.id}, 1) returning id`;
    await kit.sql`insert into customers.customer_comparison_item (store_id, comparison_id, product_id, variant_id, position) values (${kit.realm.storeId}, ${comparison!.id}, ${crypto.randomUUID()}, ${kit.headless.rawId(variant.id)}, 0)`;
    const foreignStore = await kit.createForeignStore();
    const foreignStoreId = kit.headless.rawId(foreignStore.id);
    const crossStoreCustomer = await kit.createGuestCustomer({ storeId: foreignStoreId });
    const [crossStoreComparison] = await kit.sql<
      { id: string }[]
    >`insert into customers.customer_comparison (store_id, customer_id, revision) values (${foreignStoreId}, ${crossStoreCustomer.id}, 1) returning id`;
    await kit.sql`insert into customers.customer_comparison_item (store_id, comparison_id, product_id, variant_id, position) values (${foreignStoreId}, ${crossStoreComparison!.id}, ${crypto.randomUUID()}, ${kit.headless.rawId(variant.id)}, 0)`;
    const customer = await kit.currentCustomer<any>('productComparisons { revision itemCount }');
    expect(customer.productComparisons).toMatchObject({ revision: 1, itemCount: 1 });
  });
  test('Catalog federation presents saved comparisons grouped by current primary category', async () => {
    const current = await product();
    const category = await createCategory();
    await kit.api.admin.mutation('category-api/CategoryAddProduct', {
      variables: {
        productId: current.id,
        categoryId: category.id,
        expectedRevision: current.revision,
      },
    });
    await add(current.variants.edges[0]!.node.id);
    const customer = await kit.currentCustomer<any>(
      'productComparisons { revision totalCount itemCount nodes { category { id } columns { nodes { variant { id } savedForComparison } totalCount } } }',
    );
    expect(customer.productComparisons).toEqual(
      expect.objectContaining({ revision: 1, totalCount: 1, itemCount: 1 }),
    );
    expect(customer.productComparisons.nodes[0].category.id).toBe(category.id);
  });
  test('reading comparisons does not mutate persisted selection', async () => {
    const current = await product();
    const variant = current.variants.edges[0]!.node;
    await add(variant.id);
    const before =
      await kit.sql`select * from customers.customer_comparison_item where variant_id = ${kit.headless.rawId(variant.id)}`;
    const customer = await kit.currentCustomer<any>(
      'productComparisons { revision itemCount nodes { category { id } } }',
    );
    expect(customer.productComparisons.revision).toBe(1);
    expect(
      await kit.sql`select * from customers.customer_comparison_item where variant_id = ${kit.headless.rawId(variant.id)}`,
    ).toEqual(before);
  });

  async function createCategory() {
    const { data } = await kit.api.admin.mutation('category-api/CategoryCreate', {
      variables: {
        input: {
          name: `Compare ${crypto.randomUUID()}`,
          handle: `compare-${crypto.randomUUID()}`,
          publish: true,
        },
      },
    });
    const payload = data.catalogMutation.categoryCreate;
    expect(payload.userErrors).toEqual([]);
    return payload.category!;
  }
});
