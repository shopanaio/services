/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  USER_ERROR_FIELDS,
  uniqueKey,
  type CustomerUserError,
} from '../customers-storefront-api/customers-storefront-test-kit';
import { CustomersE2ETestKit } from './customers-e2e-test-kit';

type ComparisonPayload = {
  customer: { id: string } | null;
  revision: number | null;
  userErrors: CustomerUserError[];
};

test.describe('Customers E2E API — comparison synchronization', () => {
  let kit: CustomersE2ETestKit;
  test.beforeEach(async ({ api, request }) => {
    kit = new CustomersE2ETestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  const comparisonRevision = async (target = kit) => {
    const [row] = await target.sql<
      { revision: number }[]
    >`select revision from customers.customer_comparison where customer_id = ${target.customer.rawId}`;
    return row?.revision ?? 0;
  };
  const mutate = (
    target: CustomersE2ETestKit,
    field: string,
    type: string,
    input: Record<string, unknown>,
  ) =>
    target.mutation<ComparisonPayload>(
      field,
      type,
      input,
      `customer { id } revision userErrors { ${USER_ERROR_FIELDS} }`,
    );
  const add = async (variantId: string, target = kit) =>
    mutate(target, 'customerComparisonVariantAdd', 'CustomerComparisonVariantAddInput', {
      variantId,
      expectedRevision: await comparisonRevision(target),
      idempotencyKey: uniqueKey(),
    });
  const remove = async (variantId: string) =>
    mutate(kit, 'customerComparisonVariantRemove', 'CustomerComparisonVariantRemoveInput', {
      variantId,
      expectedRevision: await comparisonRevision(),
      idempotencyKey: uniqueKey(),
    });
  const product = (target = kit) =>
    target.api.admin.product.createWithOptions({
      title: `Compare ${crypto.randomUUID()}`,
      status: 'PUBLISHED',
      options: [{ name: 'Size', values: ['S', 'M'] }],
    });
  const storefrontVariantId = (variantId: string, target = kit) =>
    target.id('ProductVariant', target.headless.rawId(variantId));

  test('storefront comparison selection is visible in the admin customer aggregate', async () => {
    const variants = (await product()).variants.edges.map(({ node }) => node);
    for (const variant of variants)
      expect((await add(storefrontVariantId(variant.id))).data?.payload.userErrors).toEqual([]);
    const comparison = (await kit.adminCustomer()).comparison;
    expect(comparison.revision).toBe(2);
    expect(
      comparison.items.map(({ variantId, position }: any) => ({ variantId, position })),
    ).toEqual(variants.map((variant, position) => ({ variantId: variant.id, position })));
  });

  test('storefront comparison removal is visible through admin', async () => {
    const variants = (await product()).variants.edges.map(({ node }) => node);
    for (const variant of variants) await add(storefrontVariantId(variant.id));
    expect((await remove(storefrontVariantId(variants[0]!.id))).data?.payload.userErrors).toEqual(
      [],
    );
    expect((await kit.adminCustomer()).comparison.items).toEqual([
      expect.objectContaining({ variantId: variants[1]!.id, position: 1 }),
    ]);
  });

  test('admin comparison reads never mutate storefront selection', async () => {
    const variant = (await product()).variants.edges[0]!.node;
    await add(storefrontVariantId(variant.id));
    const first = (await kit.adminCustomer()).comparison;
    const second = (await kit.adminCustomer()).comparison;
    expect(second).toEqual(first);
    const storefront = await kit.currentCustomer<any>('productComparisons { revision itemCount }');
    expect(storefront.productComparisons).toEqual(
      expect.objectContaining({ revision: first.revision, itemCount: 1 }),
    );
  });

  test('admin cannot mutate storefront-owned comparison selection', async () => {
    const customer = await kit.adminCustomer();
    const { data, errors } = await kit.api.admin.mutation<any>(
      'customers-admin-api/CustomerUpdate',
      {
        throwOnError: false,
        variables: {
          customerId: customer.id,
          expectedRevision: customer.revision,
          operations: { comparison: { items: [] } },
        },
      },
    );
    expect(data ?? null).toBeNull();
    expect(errors?.[0]?.message).toContain('Field "comparison" is not defined');
    expect((await kit.adminCustomer()).comparison).toBeNull();
  });

  test('comparison selection remains isolated for same-email customers in different stores', async ({
    api,
    request,
  }) => {
    const projectA = api.session.project;
    const storeB = new CustomersE2ETestKit(api, request);
    try {
      await storeB.setup({ customer: false, reuseSession: true });
      expect((await storeB.adminAccountSettingsUpdate(['PASSWORD'])).userErrors).toEqual([]);
      const guestB = await storeB.adminCreate({ email: kit.customer.email });
      await storeB.enrollAdminCustomer(guestB, kit.customer.email);
      const variantB = (await product(storeB)).variants.edges[0]!.node;
      expect(
        (await add(storefrontVariantId(variantB.id, storeB), storeB)).data?.payload.userErrors,
      ).toEqual([]);
      expect((await storeB.adminCustomer()).comparison.items).toEqual([
        expect.objectContaining({ variantId: variantB.id }),
      ]);
      const adminA = await kit.inProject(projectA, () => kit.adminCustomer());
      expect(adminA.comparison).toBeNull();
      expect(
        (await kit.currentCustomer<any>('productComparisons { itemCount }')).productComparisons
          .itemCount,
      ).toBe(0);
    } finally {
      await storeB.close();
      api.session.project = projectA;
    }
  });
});
