import { EntityStatus } from '@codegen/admin-gql';
import type { ApiCheckout, ApiCheckoutTag } from '@codegen/client-gql';
import { CurrencyCode } from '@codegen/client-gql';
import { test } from '@fixtures/api/api';
import { expect } from '@playwright/test';

test.describe('checkout-api: tags', () => {
  test('should create checkout with initial tags', async ({ api }) => {
    await test.step('setup client and customer scope', async () => {
      await api.session.setupClient();
      api.session.setCustomerScope();
    });

    let checkoutId = '';

    await test.step('create checkout with two tags', async () => {
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: CurrencyCode.Usd,
        items: [],
        tags: [
          { slug: 'gift', unique: false },
          { slug: 'subscription', unique: true },
        ],
      });

      const checkout = data.checkoutMutation.checkoutCreate;
      checkoutId = checkout.id;

      expect(checkout.tags).toBeDefined();
      expect(checkout.tags.length).toBe(2);

      const giftTag = checkout.tags.find((t: ApiCheckoutTag) => t.slug === 'gift');
      const subscriptionTag = checkout.tags.find((t: ApiCheckoutTag) => t.slug === 'subscription');

      expect(giftTag).toBeDefined();
      expect(giftTag?.unique).toBe(false);
      expect(giftTag?.id).toBeTruthy();

      expect(subscriptionTag).toBeDefined();
      expect(subscriptionTag?.unique).toBe(true);
      expect(subscriptionTag?.id).toBeTruthy();
    });

    await test.step('verify tags persist when reading checkout', async () => {
      const { data } = await api.client.checkout.readFull(checkoutId);
      const checkout = data.checkoutQuery.checkout;

      expect(checkout?.tags).toBeDefined();
      expect(checkout?.tags.length).toBe(2);

      const tagSlugs = checkout?.tags.map((t: ApiCheckoutTag) => t.slug).sort();
      expect(tagSlugs).toEqual(['gift', 'subscription']);
    });
  });

  test('should create and manage tags via mutations', async ({ api }) => {
    await test.step('setup client and customer scope', async () => {
      await api.session.setupClient();
      api.session.setCustomerScope();
    });

    let checkoutId = '';
    let tagId = '';

    await test.step('create empty checkout', async () => {
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: CurrencyCode.Usd,
        items: [],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
      expect(checkoutId).toBeTruthy();
    });

    await test.step('create a tag', async () => {
      const { data } = await api.client.checkout.createTag({
        checkoutId,
        tag: {
          slug: 'express',
          unique: true,
        },
      });

      const checkout = data.checkoutMutation.checkoutTagCreate;
      expect(checkout.tags.length).toBe(1);
      expect(checkout.tags[0].slug).toBe('express');
      expect(checkout.tags[0].unique).toBe(true);

      tagId = checkout.tags[0].id;
    });

    await test.step('update tag to non-unique', async () => {
      const { data } = await api.client.checkout.updateTag({
        checkoutId,
        tagId,
        unique: false,
      });

      const checkout = data.checkoutMutation.checkoutTagUpdate;
      const updatedTag = checkout.tags.find((t: ApiCheckoutTag) => t.id === tagId);

      expect(updatedTag).toBeDefined();
      expect(updatedTag?.unique).toBe(false);
      expect(updatedTag?.slug).toBe('express');
    });

    await test.step('update tag slug', async () => {
      const { data } = await api.client.checkout.updateTag({
        checkoutId,
        tagId,
        slug: 'priority',
      });

      const checkout = data.checkoutMutation.checkoutTagUpdate;
      const updatedTag = checkout.tags.find((t: ApiCheckoutTag) => t.id === tagId);

      expect(updatedTag).toBeDefined();
      expect(updatedTag?.slug).toBe('priority');
    });

    await test.step('delete tag', async () => {
      const { data } = await api.client.checkout.deleteTag({
        checkoutId,
        tagId,
      });

      const checkout = data.checkoutMutation.checkoutTagDelete;
      expect(checkout.tags.length).toBe(0);
    });
  });

  test('should add items with non-unique tags', async ({ api }) => {
    await test.step('setup client', async () => {
      await api.session.setupClient();
      api.session.setCustomerScope();
    });

    let checkoutId = '';
    let purchasableId1 = '';
    let purchasableId2 = '';

    await test.step('create products', async () => {
      api.session.setTenantScope();
      const handle1 = `test-product-${Date.now()}-1`;
      const handle2 = `test-product-${Date.now()}-2`;

      const product1 = await api.admin.product.create({
        input: {
          title: 'Product 1 for Tags',
          status: EntityStatus.Published,
          slug: handle1,
          groups: [],
          requiresShipping: true,
          tags: [],
          variants: {
            create: [
              api.admin.product.getDefaultVariantInput({
                title: 'Variant 1',
                slug: handle1,
                price: 1000,
                stockStatus: 'IN_STOCK',
                inListing: true,
                variantSortIndex: 0,
                sku: 'SKU-TAG-1',
              }),
            ],
          },
        },
      });

      const product2 = await api.admin.product.create({
        input: {
          title: 'Product 2 for Tags',
          status: EntityStatus.Published,
          slug: handle2,
          groups: [],
          requiresShipping: true,
          tags: [],
          variants: {
            create: [
              api.admin.product.getDefaultVariantInput({
                title: 'Variant 2',
                slug: handle2,
                price: 2000,
                stockStatus: 'IN_STOCK',
                inListing: true,
                variantSortIndex: 0,
                sku: 'SKU-TAG-2',
              }),
            ],
          },
        },
      });

      api.session.setCustomerScope();
      const variant1 = await api.client.variant.get(handle1);
      const variant2 = await api.client.variant.get(handle2);
      purchasableId1 = variant1.id;
      purchasableId2 = variant2.id;
    });

    await test.step('create checkout with regular tag', async () => {
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: CurrencyCode.Usd,
        items: [],
        tags: [{ slug: 'bundle', unique: false }],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
      expect(checkoutId).toBeTruthy();
    });

    await test.step('add multiple items with same tag', async () => {
      const { data } = await api.client.checkout.addLines({
        checkoutId,
        lines: [
          { purchasableId: purchasableId1, quantity: 1, tagSlug: 'bundle' },
          { purchasableId: purchasableId2, quantity: 2, tagSlug: 'bundle' },
        ],
      });

      const checkout = data.checkoutMutation.checkoutLinesAdd.checkout as ApiCheckout;
      expect(checkout.lines.length).toBe(2);

      const line1 = checkout.lines.find((l) => l.purchasableId === purchasableId1);
      const line2 = checkout.lines.find((l) => l.purchasableId === purchasableId2);

      expect(line1?.tag).toBeDefined();
      expect(line1?.tag?.slug).toBe('bundle');
      expect(line1?.tag?.unique).toBe(false);

      expect(line2?.tag).toBeDefined();
      expect(line2?.tag?.slug).toBe('bundle');
      expect(line2?.tag?.unique).toBe(false);

      expect(checkout.totalQuantity).toBe(3);
    });
  });

  test('should enforce unique tag behavior when adding items', async ({ api }) => {
    await test.step('setup client', async () => {
      await api.session.setupClient();
      api.session.setCustomerScope();
    });

    let checkoutId = '';
    let purchasableId1 = '';
    let purchasableId2 = '';
    let purchasableId3 = '';

    await test.step('create products', async () => {
      api.session.setTenantScope();
      const handle1 = `test-unique-${Date.now()}-1`;
      const handle2 = `test-unique-${Date.now()}-2`;
      const handle3 = `test-unique-${Date.now()}-3`;

      const createProduct = async (handle: string, sku: string, price: number) => {
        return await api.admin.product.create({
          input: {
            title: `Product ${sku}`,
            status: EntityStatus.Published,
            slug: handle,
            groups: [],
            requiresShipping: true,
            tags: [],
            variants: {
              create: [
                api.admin.product.getDefaultVariantInput({
                  title: 'Variant',
                  slug: handle,
                  price,
                  stockStatus: 'IN_STOCK',
                  inListing: true,
                  variantSortIndex: 0,
                  sku,
                }),
              ],
            },
          },
        });
      };

      await createProduct(handle1, 'SKU-UNIQUE-1', 1000);
      await createProduct(handle2, 'SKU-UNIQUE-2', 2000);
      await createProduct(handle3, 'SKU-UNIQUE-3', 3000);

      api.session.setCustomerScope();
      const variant1 = await api.client.variant.get(handle1);
      const variant2 = await api.client.variant.get(handle2);
      const variant3 = await api.client.variant.get(handle3);
      purchasableId1 = variant1.id;
      purchasableId2 = variant2.id;
      purchasableId3 = variant3.id;
    });

    await test.step('create checkout with unique tag', async () => {
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: CurrencyCode.Usd,
        items: [],
        tags: [{ slug: 'main', unique: true }],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
      expect(checkoutId).toBeTruthy();
    });

    await test.step('add first item with unique tag', async () => {
      const { data } = await api.client.checkout.addLines({
        checkoutId,
        lines: [{ purchasableId: purchasableId1, quantity: 1, tagSlug: 'main' }],
      });

      const checkout = data.checkoutMutation.checkoutLinesAdd.checkout as ApiCheckout;
      expect(checkout.lines.length).toBe(1);

      const line = checkout.lines[0];
      expect(line.tag).toBeDefined();
      expect(line.tag?.slug).toBe('main');
      expect(line.tag?.unique).toBe(true);
      expect(line.purchasableId).toBe(purchasableId1);
    });

    await test.step('add second item with same unique tag - replaces first', async () => {
      const { data } = await api.client.checkout.addLines({
        checkoutId,
        lines: [{ purchasableId: purchasableId2, quantity: 2, tagSlug: 'main' }],
      });

      const checkout = data.checkoutMutation.checkoutLinesAdd.checkout as ApiCheckout;

      // Only one line should remain (the new one replaces the old one)
      expect(checkout.lines.length).toBe(1);

      const line = checkout.lines[0];
      expect(line.purchasableId).toBe(purchasableId2);
      expect(line.quantity).toBe(2);
      expect(line.tag?.slug).toBe('main');
      expect(line.tag?.unique).toBe(true);
    });

    await test.step('add third item without tag - coexists with tagged item', async () => {
      const { data } = await api.client.checkout.addLines({
        checkoutId,
        lines: [{ purchasableId: purchasableId3, quantity: 1 }],
      });

      const checkout = data.checkoutMutation.checkoutLinesAdd.checkout as ApiCheckout;

      // Now we should have 2 lines: one with tag, one without
      expect(checkout.lines.length).toBe(2);

      const taggedLine = checkout.lines.find((l) => l.tag !== null);
      const untaggedLine = checkout.lines.find((l) => l.tag === null);

      expect(taggedLine).toBeDefined();
      expect(taggedLine?.purchasableId).toBe(purchasableId2);
      expect(taggedLine?.tag?.slug).toBe('main');

      expect(untaggedLine).toBeDefined();
      expect(untaggedLine?.purchasableId).toBe(purchasableId3);
      expect(untaggedLine?.tag).toBeNull();
    });
  });

  test('should prevent duplicate tag slugs in same checkout', async ({ api }) => {
    await test.step('setup client', async () => {
      await api.session.setupClient();
      api.session.setCustomerScope();
    });

    let checkoutId = '';

    await test.step('create checkout', async () => {
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: CurrencyCode.Usd,
        items: [],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
    });

    await test.step('create first tag', async () => {
      const { data } = await api.client.checkout.createTag({
        checkoutId,
        tag: { slug: 'duplicate', unique: false },
      });

      expect(data.checkoutMutation.checkoutTagCreate.tags.length).toBe(1);
    });

    await test.step('attempt to create duplicate tag - should fail', async () => {
      const { errors } = await api.client.checkout.createTag({
        checkoutId,
        tag: { slug: 'duplicate', unique: false },
      });

      expect(errors).toBeDefined();
      expect(errors?.length).toBeGreaterThan(0);
      expect(JSON.stringify(errors)).toContain('already exists');
    });
  });

  test('should validate tag slug format', async ({ api }) => {
    await test.step('setup client', async () => {
      await api.session.setupClient();
      api.session.setCustomerScope();
    });

    let checkoutId = '';

    await test.step('create checkout', async () => {
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: CurrencyCode.Usd,
        items: [],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
    });

    await test.step('attempt to create tag with invalid slug - should fail', async () => {
      const { errors } = await api.client.checkout.createTag({
        checkoutId,
        tag: { slug: 'invalid-slug!', unique: false },
      });

      expect(errors).toBeDefined();
      expect(errors?.length).toBeGreaterThan(0);
      // Validation error message should mention alphanumeric requirement
      expect(JSON.stringify(errors)).toMatch(/alphanumeric|a-zA-Z0-9/);
    });
  });

  test('should not allow making tag unique if already assigned to multiple lines', async ({
    api,
  }) => {
    await test.step('setup client', async () => {
      await api.session.setupClient();
      api.session.setCustomerScope();
    });

    let checkoutId = '';
    let tagId = '';
    let purchasableId1 = '';
    let purchasableId2 = '';

    await test.step('create products', async () => {
      api.session.setTenantScope();
      const handle1 = `test-multi-${Date.now()}-1`;
      const handle2 = `test-multi-${Date.now()}-2`;

      const createProduct = async (handle: string, sku: string) => {
        return await api.admin.product.create({
          input: {
            title: `Product ${sku}`,
            status: EntityStatus.Published,
            slug: handle,
            groups: [],
            requiresShipping: true,
            tags: [],
            variants: {
              create: [
                api.admin.product.getDefaultVariantInput({
                  title: 'Variant',
                  slug: handle,
                  price: 1000,
                  stockStatus: 'IN_STOCK',
                  inListing: true,
                  variantSortIndex: 0,
                  sku,
                }),
              ],
            },
          },
        });
      };

      await createProduct(handle1, 'SKU-MULTI-1');
      await createProduct(handle2, 'SKU-MULTI-2');

      api.session.setCustomerScope();
      const variant1 = await api.client.variant.get(handle1);
      const variant2 = await api.client.variant.get(handle2);
      purchasableId1 = variant1.id;
      purchasableId2 = variant2.id;
    });

    await test.step('create checkout with non-unique tag', async () => {
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: CurrencyCode.Usd,
        items: [],
        tags: [{ slug: 'shared', unique: false }],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
      tagId = data.checkoutMutation.checkoutCreate.tags[0].id;
    });

    await test.step('add two items with same tag', async () => {
      const { data } = await api.client.checkout.addLines({
        checkoutId,
        lines: [
          { purchasableId: purchasableId1, quantity: 1, tagSlug: 'shared' },
          { purchasableId: purchasableId2, quantity: 1, tagSlug: 'shared' },
        ],
      });

      const checkout = data.checkoutMutation.checkoutLinesAdd.checkout as ApiCheckout;
      expect(checkout.lines.length).toBe(2);

      const line1 = checkout.lines.find((l) => l.purchasableId === purchasableId1);
      const line2 = checkout.lines.find((l) => l.purchasableId === purchasableId2);

      expect(line1?.tag?.slug).toBe('shared');
      expect(line2?.tag?.slug).toBe('shared');
    });

    await test.step('attempt to make tag unique - should fail', async () => {
      const { errors } = await api.client.checkout.updateTag({
        checkoutId,
        tagId,
        unique: true,
      });

      expect(errors).toBeDefined();
      expect(errors?.length).toBeGreaterThan(0);
      expect(JSON.stringify(errors)).toMatch(/multiple lines|cannot be made unique/i);
    });
  });
});
