
import type { ApiCheckout, ApiCheckoutCost, ApiCheckoutLine, ApiCheckoutTag } from '@codegen/client-gql';

import { test } from '@fixtures/api/api';
import { expect } from '@playwright/test';

test.describe('checkout-api: create order from checkout', () => {
  test('creates order via orders service from checkout', async ({ api }) => {
    await api.session.setupClient();
    api.session.setCustomerScope();

    const { data: createdResp } = await api.client.checkout.create({
      localeCode: 'en',
      currencyCode: 'USD',
      items: [],
    });
    const checkoutId = createdResp.checkoutMutation.checkoutCreate.id as string;

    api.session.setTenantScope();
    const handle = `order-from-checkout-${Date.now()}`;
    await api.admin.product.create({
      input: {
        title: 'Order From Checkout P1',
        status: 'PUBLISHED',
        slug: `${handle}-p1`,
        groups: [],
        requiresShipping: true,
        tags: [],
        variants: {
          create: [
            api.admin.product.getDefaultVariantInput({
              title: 'V1',
              slug: `${handle}-v1`,
              price: 1000,
              stockStatus: 'IN_STOCK',
              inListing: true,
              variantSortIndex: 0,
              sku: 'SKU-OFC-1',
            }),
          ],
        },
      },
    });
    await api.admin.product.create({
      input: {
        title: 'Order From Checkout P2',
        status: 'PUBLISHED',
        slug: `${handle}-p2`,
        groups: [],
        requiresShipping: true,
        tags: [],
        variants: {
          create: [
            api.admin.product.getDefaultVariantInput({
              title: 'V2',
              slug: `${handle}-v2`,
              price: 2000,
              stockStatus: 'IN_STOCK',
              inListing: true,
              variantSortIndex: 0,
              sku: 'SKU-OFC-2',
            }),
          ],
        },
      },
    });

    api.session.setCustomerScope();
    // Fetch products from client API to get correct purchasable IDs (base64 encoded)
    const variant1 = await api.client.variant.get(`${handle}-v1`);
    const variant2 = await api.client.variant.get(`${handle}-v2`);

    await api.client.checkout.addLines({
      checkoutId,
      lines: [
        { purchasableId: variant1.id, quantity: 1 },
        { purchasableId: variant2.id, quantity: 2 },
      ],
    });

    const { data } = await api.client.order.create({
      checkoutId,
    });

    const orderId = data.orderMutation.orderCreate.id as string;
    expect(orderId).toBeTruthy();

    expect(orderId).toBeTruthy();
    expect(data.orderMutation.orderCreate.status).toBe('DRAFT');
    expect(data.orderMutation.orderCreate.cost.totalAmount.amount).toBe(50);
  });

  test('creates order with delivery context carried from checkout', async ({ api }) => {
    await test.step('setup client and customer scope', async () => {
      await api.session.setupClient();
      api.session.setCustomerScope();
    });

    let checkoutId = '';
    let purchasableId = '';
    const handle = `delivery-context-${Date.now()}`;

    await test.step('create product variant', async () => {
      api.session.setTenantScope();
      await api.admin.product.create({
        input: {
          title: 'Delivery Context Product',
          status: 'PUBLISHED',
          slug: handle,
          groups: [],
          requiresShipping: true,
          tags: [],
          variants: {
            create: [
              api.admin.product.getDefaultVariantInput({
                title: 'Default',
                slug: handle,
                price: 3000,
                stockStatus: 'IN_STOCK',
                inListing: true,
                variantSortIndex: 0,
                sku: `SKU-DC-${Date.now()}`,
              }),
            ],
          },
        },
      });

      api.session.setCustomerScope();
      const variant = await api.client.variant.get(handle);
      purchasableId = variant.id;
      expect(purchasableId).toBeTruthy();
    });

    await test.step('create checkout and add lines', async () => {
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: 'USD',
        items: [],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
      expect(checkoutId).toBeTruthy();

      await api.client.checkout.addLines({
        checkoutId,
        lines: [{ purchasableId, quantity: 3 }],
      });
    });

    let selectedDeliveryGroupId = '';

    await test.step('add delivery address, recipient and select method', async () => {
      const { data } = await api.client.checkout.addDeliveryAddresses({
        checkoutId,
        addresses: [
          {
            address1: '111 Delivery Lane',
            city: 'Test City',
            countryCode: 'US',
            postalCode: '10001',
            provinceCode: 'NY',
          },
        ],
      });

      const deliveryGroup = data.checkoutMutation.checkoutDeliveryAddressesAdd.deliveryGroups[0];
      expect(deliveryGroup).toBeTruthy();
      selectedDeliveryGroupId = deliveryGroup.id;

      await api.client.checkout.addDeliveryRecipients({
        checkoutId,
        recipients: [
          {
            deliveryGroupId: selectedDeliveryGroupId,
            recipient: {
              firstName: 'Alex',
              lastName: 'Courier',
              email: 'alex.courier@example.com',
            },
          },
        ],
      });

      const { data: readData } = await api.client.checkout.readFull(checkoutId);
      const checkout = readData.checkoutQuery.checkout;
      expect(checkout).toBeTruthy();
      const group = checkout?.deliveryGroups.find(
        (deliveryGroup) => deliveryGroup.id === selectedDeliveryGroupId,
      );
      expect(group?.deliveryMethods.length).toBeGreaterThan(0);
      const method = group?.deliveryMethods[0];
      expect(method).toBeTruthy();

      await api.client.checkout.updateDeliveryMethod({
        checkoutId,
        deliveryGroupId: selectedDeliveryGroupId,
        shippingMethodCode: method?.code ?? '',
        provider: method?.provider?.code ?? '',
      });

      const { data: updatedData } = await api.client.checkout.readFull(checkoutId);
      const updatedGroup = updatedData.checkoutQuery.checkout?.deliveryGroups.find(
        (deliveryGroup) => deliveryGroup.id === selectedDeliveryGroupId,
      );
      expect(updatedGroup?.selectedDeliveryMethod?.code).toBe(method?.code);
    });

    let finalCheckoutCost: ApiCheckoutCost | null = null;
    await test.step('capture checkout cost snapshot', async () => {
      const { data } = await api.client.checkout.readFull(checkoutId);
      const checkout = data.checkoutQuery.checkout;
      if (!checkout) {
        throw new Error('Checkout not found');
      }
      finalCheckoutCost = checkout.cost;
      expect(checkout.deliveryGroups.some((group) => group.selectedDeliveryMethod)).toBe(true);
    });

    await test.step('create order and compare cost', async () => {
      if (!finalCheckoutCost) {
        throw new Error('No checkout cost captured');
      }
      const { data } = await api.client.order.create({
        checkoutId,
      });
      const order = data.orderMutation.orderCreate;
      expect(order.id).toBeTruthy();
      expect(order.cost.totalAmount.amount).toBe(finalCheckoutCost.totalAmount.amount);
      expect(order.cost.totalShippingAmount.amount).toBe(
        finalCheckoutCost.totalShippingAmount.amount,
      );
      expect(order.cost.totalDiscountAmount.amount).toBe(
        finalCheckoutCost.totalDiscountAmount.amount,
      );
    });
  });

  test('creates order reflecting promo code adjustments', async ({ api }) => {
    await test.step('setup client and customer scope', async () => {
      await api.session.setupClient();
      api.session.setCustomerScope();
    });

    let checkoutId = '';
    let purchasableId = '';
    const handle = `promo-order-${Date.now()}`;

    await test.step('create promo product', async () => {
      api.session.setTenantScope();
      await api.admin.product.create({
        input: {
          title: 'Promo Order Product',
          status: 'PUBLISHED',
          slug: handle,
          groups: [],
          requiresShipping: true,
          tags: [],
          variants: {
            create: [
              api.admin.product.getDefaultVariantInput({
                title: 'Promo',
                slug: handle,
                price: 10000,
                stockStatus: 'IN_STOCK',
                inListing: true,
                variantSortIndex: 0,
                sku: `SKU-PROMO-ORDER-${Date.now()}`,
              }),
            ],
          },
        },
      });

      api.session.setCustomerScope();
      const variant = await api.client.variant.get(handle);
      purchasableId = variant.id;
      expect(purchasableId).toBeTruthy();
    });

    await test.step('create checkout and add promo-eligible lines', async () => {
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: 'USD',
        items: [],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
      expect(checkoutId).toBeTruthy();

      await api.client.checkout.addLines({
        checkoutId,
        lines: [{ purchasableId, quantity: 5 }],
      });

      const { data: promoResponse } = await api.client.checkout.addPromoCode({
        checkoutId,
        code: 'SAVE50',
      });

      const checkout = promoResponse.checkoutMutation.checkoutPromoCodeAdd;
      expect(checkout.appliedPromoCodes.length).toBe(1);
      expect(checkout.appliedPromoCodes[0].code).toBe('SAVE50');
      expect(checkout.cost.totalDiscountAmount.amount).toBeGreaterThan(0);

      const { data: confirmed } = await api.client.checkout.readFull(checkoutId);
      expect(confirmed.checkoutQuery.checkout?.cost.totalAmount.amount).toBe(
        checkout.cost.totalAmount.amount,
      );
    });

    await test.step('create order and verify promo adjustments', async () => {
      const finalCheckout = await api.client.checkout.readFull(checkoutId);
      const checkout = finalCheckout.data.checkoutQuery.checkout;
      if (!checkout) {
        throw new Error('Checkout missing before order creation');
      }

      const { data } = await api.client.order.create({
        checkoutId,
      });

      const order = data.orderMutation.orderCreate;
      expect(order.cost.totalAmount.amount).toBe(checkout.cost.totalAmount.amount);
      expect(order.cost.totalDiscountAmount.amount).toBe(checkout.cost.totalDiscountAmount.amount);
    });
  });

  test('creates order from checkout with tags', async ({ api }) => {
    await test.step('setup client and customer scope', async () => {
      await api.session.setupClient();
      api.session.setCustomerScope();
    });

    let checkoutId = '';
    let purchasableId1 = '';
    let purchasableId2 = '';
    const handle = `order-tags-${Date.now()}`;

    await test.step('create product variants', async () => {
      api.session.setTenantScope();

      await api.admin.product.create({
        input: {
          title: 'Order Tags Product 1',
          status: 'PUBLISHED',
          slug: `${handle}-p1`,
          groups: [],
          requiresShipping: true,
          tags: [],
          variants: {
            create: [
              api.admin.product.getDefaultVariantInput({
                title: 'V1',
                slug: `${handle}-v1`,
                price: 2500,
                stockStatus: 'IN_STOCK',
                inListing: true,
                variantSortIndex: 0,
                sku: `SKU-OT-1-${Date.now()}`,
              }),
            ],
          },
        },
      });

      await api.admin.product.create({
        input: {
          title: 'Order Tags Product 2',
          status: 'PUBLISHED',
          slug: `${handle}-p2`,
          groups: [],
          requiresShipping: true,
          tags: [],
          variants: {
            create: [
              api.admin.product.getDefaultVariantInput({
                title: 'V2',
                slug: `${handle}-v2`,
                price: 1500,
                stockStatus: 'IN_STOCK',
                inListing: true,
                variantSortIndex: 0,
                sku: `SKU-OT-2-${Date.now()}`,
              }),
            ],
          },
        },
      });

      api.session.setCustomerScope();
      const variant1 = await api.client.variant.get(`${handle}-v1`);
      const variant2 = await api.client.variant.get(`${handle}-v2`);
      purchasableId1 = variant1.id;
      purchasableId2 = variant2.id;
    });

    await test.step('create checkout with tags', async () => {
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: 'USD',
        items: [],
        tags: [
          { slug: 'gift', unique: false },
          { slug: 'priority', unique: true },
        ],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
      expect(checkoutId).toBeTruthy();

      const tags = data.checkoutMutation.checkoutCreate.tags;
      expect(tags).toHaveLength(2);
      expect(tags.map((t: ApiCheckoutTag) => t.slug).sort()).toEqual(['gift', 'priority']);
    });

    await test.step('add lines with tag associations', async () => {
      const { data } = await api.client.checkout.addLines({
        checkoutId,
        lines: [
          { purchasableId: purchasableId1, quantity: 2, tagSlug: 'gift' },
          { purchasableId: purchasableId2, quantity: 1, tagSlug: 'priority' },
        ],
      });

      const checkout = data.checkoutMutation.checkoutLinesAdd.checkout as ApiCheckout;
      expect(checkout.lines).toHaveLength(2);

      const line1 = checkout.lines.find((l) => l.purchasableId === purchasableId1);
      const line2 = checkout.lines.find((l) => l.purchasableId === purchasableId2);

      expect(line1?.tag?.slug).toBe('gift');
      expect(line2?.tag?.slug).toBe('priority');
    });

    let checkoutCost: ApiCheckoutCost | null = null;

    await test.step('capture checkout cost', async () => {
      const { data } = await api.client.checkout.readFull(checkoutId);
      const checkout = data.checkoutQuery.checkout;
      if (!checkout) throw new Error('Checkout not found');
      checkoutCost = checkout.cost;
      // Expected: $25 * 2 + $15 * 1 = $65
      expect(checkoutCost.subtotalAmount.amount).toBe(65);
    });

    await test.step('create order and verify', async () => {
      if (!checkoutCost) throw new Error('No checkout cost');

      const { data } = await api.client.order.create({ checkoutId });
      const order = data.orderMutation.orderCreate;

      expect(order.id).toBeTruthy();
      expect(order.status).toBe('DRAFT');
      expect(order.cost.subtotalAmount.amount).toBe(checkoutCost.subtotalAmount.amount);
      expect(order.cost.totalAmount.amount).toBe(checkoutCost.totalAmount.amount);
      expect(order.lines).toHaveLength(2);
    });
  });

  test('creates order from checkout with children (bundles)', async ({ api }) => {
    await test.step('setup client', async () => {
      await api.session.setupClient();
    });

    let checkoutId = '';
    const timestamp = Date.now();

    // Helper to create products with ProductGroup for bundles
    const createBundleProducts = async () => {
      api.session.setTenantScope();

      // Create child products first
      const child1Handle = `bundle-order-child1-${timestamp}`;
      const child1Product = await api.admin.product.create({
        input: {
          title: 'Bundle Order Child 1',
          status: 'PUBLISHED',
          slug: child1Handle,
          groups: [],
          requiresShipping: true,
          tags: [],
          variants: {
            create: [
              api.admin.product.getDefaultVariantInput({
                title: 'Child Variant 1',
                slug: child1Handle,
                price: 2000,
                stockStatus: 'IN_STOCK',
                inListing: true,
                variantSortIndex: 0,
                sku: `SKU-BOC1-${timestamp}`,
              }),
            ],
          },
        },
      });
      const child1VariantId = child1Product.variants[0].id;

      const child2Handle = `bundle-order-child2-${timestamp}`;
      const child2Product = await api.admin.product.create({
        input: {
          title: 'Bundle Order Child 2',
          status: 'PUBLISHED',
          slug: child2Handle,
          groups: [],
          requiresShipping: true,
          tags: [],
          variants: {
            create: [
              api.admin.product.getDefaultVariantInput({
                title: 'Child Variant 2',
                slug: child2Handle,
                price: 1500,
                stockStatus: 'IN_STOCK',
                inListing: true,
                variantSortIndex: 0,
                sku: `SKU-BOC2-${timestamp}`,
              }),
            ],
          },
        },
      });
      const child2VariantId = child2Product.variants[0].id;

      // Create parent product with ProductGroup containing children
      const parentHandle = `bundle-order-parent-${timestamp}`;
      const parentProduct = await api.admin.product.create({
        input: {
          title: 'Bundle Order Parent',
          status: 'PUBLISHED',
          slug: parentHandle,
          groups: [],
          requiresShipping: true,
          tags: [],
          variants: {
            create: [
              api.admin.product.getDefaultVariantInput({
                title: 'Parent Variant',
                slug: parentHandle,
                price: 5000,
                stockStatus: 'IN_STOCK',
                inListing: true,
                variantSortIndex: 0,
                sku: `SKU-BOP-${timestamp}`,
              }),
            ],
          },
        },
      });

      // Add groups via update
      await api.admin.product.update({
        input: {
          id: parentProduct.id,
          groups: {
            create: [
              {
                title: 'Bundle Items',
                isRequired: false,
                isMultiple: true,
                sortIndex: 0,
                items: [
                  {
                    variantId: child1VariantId,
                    sortIndex: 0,
                    priceType: 'BASE_ADJUST_PERCENT',
                    pricePercentageValue: 25, // 25% discount
                  },
                  {
                    variantId: child2VariantId,
                    sortIndex: 1,
                    priceType: 'FREE',
                  },
                ],
              },
            ],
          },
        },
      });

      api.session.setCustomerScope();
      const parentVariant = await api.client.variant.get(parentHandle);
      const child1Variant = await api.client.variant.get(child1Handle);
      const child2Variant = await api.client.variant.get(child2Handle);

      return {
        parentId: parentVariant.id,
        child1Id: child1Variant.id,
        child2Id: child2Variant.id,
      };
    };

    let products: Awaited<ReturnType<typeof createBundleProducts>>;

    await test.step('create products with bundle configuration', async () => {
      products = await createBundleProducts();
    });

    await test.step('create checkout', async () => {
      api.session.setCustomerScope();
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: 'USD',
        items: [],
      });
      checkoutId = data.checkoutMutation.checkoutCreate.id;
      expect(checkoutId).toBeTruthy();
    });

    await test.step('add bundle line with children', async () => {
      const { data, errors } = await api.client.checkout.addLinesWithChildren({
        checkoutId,
        lines: [
          {
            purchasableId: products.parentId,
            quantity: 1,
            children: [
              { purchasableId: products.child1Id, quantity: 2 },
              { purchasableId: products.child2Id, quantity: 1 },
            ],
          },
        ],
      });

      expect(errors).toBeFalsy();

      const checkout = data.checkoutMutation.checkoutLinesAdd.checkout;
      expect(checkout?.lines).toHaveLength(1);

      const parentLine = checkout?.lines[0] as ApiCheckoutLine;
      expect(parentLine.children).toHaveLength(2);
    });

    let checkoutCost: ApiCheckoutCost | null = null;

    await test.step('capture checkout cost', async () => {
      const { data } = await api.client.checkout.readFull(checkoutId);
      const checkout = data.checkoutQuery.checkout;
      if (!checkout) throw new Error('Checkout not found');
      checkoutCost = checkout.cost;
      // Parent: $50
      // Child1: $20 - 25% = $15 * 2 = $30
      // Child2: FREE ($0)
      // Total: $50 + $30 + $0 = $80
      expect(checkoutCost.subtotalAmount.amount).toBe(80);
    });

    await test.step('create order and verify cost matches', async () => {
      if (!checkoutCost) throw new Error('No checkout cost');

      const { data } = await api.client.order.create({ checkoutId });
      const order = data.orderMutation.orderCreate;

      expect(order.id).toBeTruthy();
      expect(order.status).toBe('DRAFT');
      expect(order.cost.subtotalAmount.amount).toBe(checkoutCost.subtotalAmount.amount);
      expect(order.cost.totalAmount.amount).toBe(checkoutCost.totalAmount.amount);
    });
  });

  test('creates order from checkout with tags and children combined', async ({ api }) => {
    await test.step('setup client', async () => {
      await api.session.setupClient();
    });

    let checkoutId = '';
    const timestamp = Date.now();

    // Helper to create products with ProductGroup for bundles
    const createBundleProducts = async () => {
      api.session.setTenantScope();

      // Create child product
      const childHandle = `combo-order-child-${timestamp}`;
      const childProduct = await api.admin.product.create({
        input: {
          title: 'Combo Order Child',
          status: 'PUBLISHED',
          slug: childHandle,
          groups: [],
          requiresShipping: true,
          tags: [],
          variants: {
            create: [
              api.admin.product.getDefaultVariantInput({
                title: 'Child Variant',
                slug: childHandle,
                price: 1000,
                stockStatus: 'IN_STOCK',
                inListing: true,
                variantSortIndex: 0,
                sku: `SKU-COC-${timestamp}`,
              }),
            ],
          },
        },
      });
      const childVariantId = childProduct.variants[0].id;

      // Create parent product with ProductGroup
      const parentHandle = `combo-order-parent-${timestamp}`;
      const parentProduct = await api.admin.product.create({
        input: {
          title: 'Combo Order Parent',
          status: 'PUBLISHED',
          slug: parentHandle,
          groups: [],
          requiresShipping: true,
          tags: [],
          variants: {
            create: [
              api.admin.product.getDefaultVariantInput({
                title: 'Parent Variant',
                slug: parentHandle,
                price: 3000,
                stockStatus: 'IN_STOCK',
                inListing: true,
                variantSortIndex: 0,
                sku: `SKU-COP-${timestamp}`,
              }),
            ],
          },
        },
      });

      // Add groups via update
      await api.admin.product.update({
        input: {
          id: parentProduct.id,
          groups: {
            create: [
              {
                title: 'Combo Items',
                isRequired: false,
                isMultiple: true,
                sortIndex: 0,
                items: [
                  {
                    variantId: childVariantId,
                    sortIndex: 0,
                    priceType: 'BASE',
                  },
                ],
              },
            ],
          },
        },
      });

      // Create standalone product (no bundle)
      const standaloneHandle = `combo-order-standalone-${timestamp}`;
      await api.admin.product.create({
        input: {
          title: 'Combo Order Standalone',
          status: 'PUBLISHED',
          slug: standaloneHandle,
          groups: [],
          requiresShipping: true,
          tags: [],
          variants: {
            create: [
              api.admin.product.getDefaultVariantInput({
                title: 'Standalone Variant',
                slug: standaloneHandle,
                price: 2000,
                stockStatus: 'IN_STOCK',
                inListing: true,
                variantSortIndex: 0,
                sku: `SKU-COS-${timestamp}`,
              }),
            ],
          },
        },
      });

      api.session.setCustomerScope();
      const parentVariant = await api.client.variant.get(parentHandle);
      const childVariant = await api.client.variant.get(childHandle);
      const standaloneVariant = await api.client.variant.get(standaloneHandle);

      return {
        parentId: parentVariant.id,
        childId: childVariant.id,
        standaloneId: standaloneVariant.id,
      };
    };

    let products: Awaited<ReturnType<typeof createBundleProducts>>;

    await test.step('create products', async () => {
      products = await createBundleProducts();
    });

    await test.step('create checkout with tags', async () => {
      api.session.setCustomerScope();
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: 'USD',
        items: [],
        tags: [
          { slug: 'bundle', unique: false },
          { slug: 'addon', unique: false },
        ],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
      expect(checkoutId).toBeTruthy();
      expect(data.checkoutMutation.checkoutCreate.tags).toHaveLength(2);
    });

    await test.step('add bundle line with tag and children', async () => {
      const { data, errors } = await api.client.checkout.addLinesWithChildren({
        checkoutId,
        lines: [
          {
            purchasableId: products.parentId,
            quantity: 1,
            tagSlug: 'bundle',
            children: [{ purchasableId: products.childId, quantity: 1 }],
          },
        ],
      });

      expect(errors).toBeFalsy();

      const checkout = data.checkoutMutation.checkoutLinesAdd.checkout;
      expect(checkout?.lines).toHaveLength(1);

      const parentLine = checkout?.lines[0] as ApiCheckoutLine;
      expect(parentLine.tag?.slug).toBe('bundle');
      expect(parentLine.children).toHaveLength(1);
    });

    await test.step('add standalone line with different tag', async () => {
      const { data } = await api.client.checkout.addLines({
        checkoutId,
        lines: [{ purchasableId: products.standaloneId, quantity: 2, tagSlug: 'addon' }],
      });

      const checkout = data.checkoutMutation.checkoutLinesAdd.checkout as ApiCheckout;
      expect(checkout.lines).toHaveLength(2);

      const bundleLine = checkout.lines.find((l) => l.tag?.slug === 'bundle');
      const addonLine = checkout.lines.find((l) => l.tag?.slug === 'addon');

      expect(bundleLine).toBeTruthy();
      expect(addonLine).toBeTruthy();
      expect(addonLine?.quantity).toBe(2);
    });

    let checkoutCost: ApiCheckoutCost | null = null;

    await test.step('capture checkout cost', async () => {
      const { data } = await api.client.checkout.readFull(checkoutId);
      const checkout = data.checkoutQuery.checkout;
      if (!checkout) throw new Error('Checkout not found');
      checkoutCost = checkout.cost;
      // Parent: $30
      // Child: $10 (BASE price)
      // Standalone: $20 * 2 = $40
      // Total: $30 + $10 + $40 = $80
      expect(checkoutCost.subtotalAmount.amount).toBe(80);
    });

    await test.step('create order and verify', async () => {
      if (!checkoutCost) throw new Error('No checkout cost');

      const { data } = await api.client.order.create({ checkoutId });
      const order = data.orderMutation.orderCreate;

      expect(order.id).toBeTruthy();
      expect(order.status).toBe('DRAFT');
      expect(order.cost.subtotalAmount.amount).toBe(checkoutCost.subtotalAmount.amount);
      expect(order.cost.totalAmount.amount).toBe(checkoutCost.totalAmount.amount);
      expect(order.lines.length).toBeGreaterThanOrEqual(2);
    });
  });

  test('creates order from checkout with unique tag behavior preserved', async ({ api }) => {
    await test.step('setup client and customer scope', async () => {
      await api.session.setupClient();
      api.session.setCustomerScope();
    });

    let checkoutId = '';
    let purchasableId1 = '';
    let purchasableId2 = '';
    const handle = `order-unique-tag-${Date.now()}`;

    await test.step('create product variants', async () => {
      api.session.setTenantScope();

      await api.admin.product.create({
        input: {
          title: 'Unique Tag Product 1',
          status: 'PUBLISHED',
          slug: `${handle}-p1`,
          groups: [],
          requiresShipping: true,
          tags: [],
          variants: {
            create: [
              api.admin.product.getDefaultVariantInput({
                title: 'V1',
                slug: `${handle}-v1`,
                price: 3000,
                stockStatus: 'IN_STOCK',
                inListing: true,
                variantSortIndex: 0,
                sku: `SKU-UT-1-${Date.now()}`,
              }),
            ],
          },
        },
      });

      await api.admin.product.create({
        input: {
          title: 'Unique Tag Product 2',
          status: 'PUBLISHED',
          slug: `${handle}-p2`,
          groups: [],
          requiresShipping: true,
          tags: [],
          variants: {
            create: [
              api.admin.product.getDefaultVariantInput({
                title: 'V2',
                slug: `${handle}-v2`,
                price: 4000,
                stockStatus: 'IN_STOCK',
                inListing: true,
                variantSortIndex: 0,
                sku: `SKU-UT-2-${Date.now()}`,
              }),
            ],
          },
        },
      });

      api.session.setCustomerScope();
      const variant1 = await api.client.variant.get(`${handle}-v1`);
      const variant2 = await api.client.variant.get(`${handle}-v2`);
      purchasableId1 = variant1.id;
      purchasableId2 = variant2.id;
    });

    await test.step('create checkout with unique tag', async () => {
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: 'USD',
        items: [],
        tags: [{ slug: 'main', unique: true }],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
      expect(checkoutId).toBeTruthy();
    });

    await test.step('add first item with unique tag', async () => {
      await api.client.checkout.addLines({
        checkoutId,
        lines: [{ purchasableId: purchasableId1, quantity: 1, tagSlug: 'main' }],
      });
    });

    await test.step('add second item with same unique tag (replaces first)', async () => {
      const { data } = await api.client.checkout.addLines({
        checkoutId,
        lines: [{ purchasableId: purchasableId2, quantity: 2, tagSlug: 'main' }],
      });

      const checkout = data.checkoutMutation.checkoutLinesAdd.checkout as ApiCheckout;
      // Unique tag should replace the previous line
      expect(checkout.lines).toHaveLength(1);
      expect(checkout.lines[0].purchasableId).toBe(purchasableId2);
      expect(checkout.lines[0].quantity).toBe(2);
    });

    await test.step('create order and verify final state', async () => {
      const { data: readData } = await api.client.checkout.readFull(checkoutId);
      const checkout = readData.checkoutQuery.checkout;
      if (!checkout) throw new Error('Checkout not found');
      const checkoutCost = checkout.cost;
      // Only product 2: $40 * 2 = $80
      expect(checkoutCost.subtotalAmount.amount).toBe(80);

      const { data } = await api.client.order.create({ checkoutId });
      const order = data.orderMutation.orderCreate;

      expect(order.id).toBeTruthy();
      expect(order.status).toBe('DRAFT');
      expect(order.cost.subtotalAmount.amount).toBe(80);
      expect(order.cost.totalAmount.amount).toBe(80);
    });
  });

  test('creates order with minimal delivery address (city only, like Nova Poshta)', async ({
    api,
  }) => {
    await test.step('setup client and customer scope', async () => {
      await api.session.setupClient();
      api.session.setCustomerScope();
    });

    let checkoutId = '';
    let purchasableId = '';
    const handle = `minimal-address-${Date.now()}`;

    await test.step('create product variant', async () => {
      api.session.setTenantScope();
      await api.admin.product.create({
        input: {
          title: 'Minimal Address Product',
          status: 'PUBLISHED',
          slug: handle,
          groups: [],
          requiresShipping: true,
          tags: [],
          variants: {
            create: [
              api.admin.product.getDefaultVariantInput({
                title: 'Default',
                slug: handle,
                price: 2500,
                stockStatus: 'IN_STOCK',
                inListing: true,
                variantSortIndex: 0,
                sku: `SKU-MA-${Date.now()}`,
              }),
            ],
          },
        },
      });

      api.session.setCustomerScope();
      const variant = await api.client.variant.get(handle);
      purchasableId = variant.id;
      expect(purchasableId).toBeTruthy();
    });

    await test.step('create checkout and add lines', async () => {
      const { data } = await api.client.checkout.create({
        localeCode: 'uk',
        currencyCode: 'USD',
        items: [],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
      expect(checkoutId).toBeTruthy();

      await api.client.checkout.addLines({
        checkoutId,
        lines: [{ purchasableId, quantity: 2 }],
      });
    });

    let selectedDeliveryGroupId = '';

    await test.step('add minimal delivery address (city only, no address1/countryCode)', async () => {
      // Simulate Nova Poshta style address - only city, no street address
      const { data } = await api.client.checkout.addDeliveryAddresses({
        checkoutId,
        addresses: [
          {
            city: 'Одеса',
            // address1: null - not provided
            // countryCode: null - not provided
            // postalCode: null - not provided
          } as any, // Cast to bypass type checking for minimal data
        ],
      });

      const deliveryGroup = data.checkoutMutation.checkoutDeliveryAddressesAdd.deliveryGroups[0];
      expect(deliveryGroup).toBeTruthy();
      selectedDeliveryGroupId = deliveryGroup.id;
    });

    await test.step('select delivery method', async () => {
      const { data: readData } = await api.client.checkout.readFull(checkoutId);
      const checkout = readData.checkoutQuery.checkout;
      expect(checkout).toBeTruthy();

      const group = checkout?.deliveryGroups.find(
        (deliveryGroup) => deliveryGroup.id === selectedDeliveryGroupId,
      );
      expect(group?.deliveryMethods.length).toBeGreaterThan(0);
      const method = group?.deliveryMethods[0];
      expect(method).toBeTruthy();

      await api.client.checkout.updateDeliveryMethod({
        checkoutId,
        deliveryGroupId: selectedDeliveryGroupId,
        shippingMethodCode: method?.code ?? '',
        provider: method?.provider?.code ?? '',
      });
    });

    await test.step('create order from checkout with minimal address', async () => {
      const { data } = await api.client.order.create({ checkoutId });
      const order = data.orderMutation.orderCreate;

      expect(order.id).toBeTruthy();
      expect(order.status).toBe('DRAFT');
      expect(order.cost.subtotalAmount.amount).toBe(50); // $25 * 2
    });
  });

  test('creates order with Nova Poshta warehouse delivery', async ({ api }) => {
    await test.step('setup client and customer scope', async () => {
      await api.session.setupClient();
      api.session.setCustomerScope();
    });

    let checkoutId = '';
    let purchasableId = '';
    const handle = `novaposhta-warehouse-${Date.now()}`;

    await test.step('create product variant', async () => {
      api.session.setTenantScope();
      await api.admin.product.create({
        input: {
          title: 'Nova Poshta Warehouse Product',
          status: 'PUBLISHED',
          slug: handle,
          groups: [],
          requiresShipping: true,
          tags: [],
          variants: {
            create: [
              api.admin.product.getDefaultVariantInput({
                title: 'Default',
                slug: handle,
                price: 1500,
                stockStatus: 'IN_STOCK',
                inListing: true,
                variantSortIndex: 0,
                sku: `SKU-NPW-${Date.now()}`,
              }),
            ],
          },
        },
      });

      api.session.setCustomerScope();
      const variant = await api.client.variant.get(handle);
      purchasableId = variant.id;
      expect(purchasableId).toBeTruthy();
    });

    await test.step('create checkout and add lines', async () => {
      const { data } = await api.client.checkout.create({
        localeCode: 'uk',
        currencyCode: 'USD',
        items: [],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
      expect(checkoutId).toBeTruthy();

      await api.client.checkout.addLines({
        checkoutId,
        lines: [{ purchasableId, quantity: 1 }],
      });
    });

    let selectedDeliveryGroupId = '';

    await test.step('add Nova Poshta style address with warehouse metadata', async () => {
      const { data } = await api.client.checkout.addDeliveryAddresses({
        checkoutId,
        addresses: [
          {
            city: 'Київ',
            data: {
              warehouseRef: 'some-warehouse-ref-123',
              warehouseDescription: 'Відділення №1: вул. Хрещатик, 1',
              cityRef: 'some-city-ref-456',
            },
          } as any,
        ],
      });

      const deliveryGroup = data.checkoutMutation.checkoutDeliveryAddressesAdd.deliveryGroups[0];
      expect(deliveryGroup).toBeTruthy();
      selectedDeliveryGroupId = deliveryGroup.id;
    });

    await test.step('select novaposhta warehouse_warehouse method', async () => {
      const { data: readData } = await api.client.checkout.readFull(checkoutId);
      const checkout = readData.checkoutQuery.checkout;
      expect(checkout).toBeTruthy();

      const group = checkout?.deliveryGroups.find(
        (deliveryGroup) => deliveryGroup.id === selectedDeliveryGroupId,
      );

      // Find novaposhta warehouse_warehouse method
      const novaposhtaMethod = group?.deliveryMethods.find(
        (m) => m.provider?.code === 'novaposhta' && m.code === 'warehouse_warehouse',
      );

      // Fallback to any available method if novaposhta not found
      const method = novaposhtaMethod ?? group?.deliveryMethods[0];
      expect(method).toBeTruthy();

      await api.client.checkout.updateDeliveryMethod({
        checkoutId,
        deliveryGroupId: selectedDeliveryGroupId,
        shippingMethodCode: method?.code ?? '',
        provider: method?.provider?.code ?? '',
      });
    });

    await test.step('create order', async () => {
      const { data } = await api.client.order.create({ checkoutId });
      const order = data.orderMutation.orderCreate;

      expect(order.id).toBeTruthy();
      expect(order.status).toBe('DRAFT');
    });
  });

  test('creates order without selecting delivery method', async ({ api }) => {
    await test.step('setup client and customer scope', async () => {
      await api.session.setupClient();
      api.session.setCustomerScope();
    });

    let checkoutId = '';
    let purchasableId = '';
    const handle = `no-delivery-method-${Date.now()}`;

    await test.step('create product variant', async () => {
      api.session.setTenantScope();
      await api.admin.product.create({
        input: {
          title: 'No Delivery Method Product',
          status: 'PUBLISHED',
          slug: handle,
          groups: [],
          requiresShipping: true,
          tags: [],
          variants: {
            create: [
              api.admin.product.getDefaultVariantInput({
                title: 'Default',
                slug: handle,
                price: 2000,
                stockStatus: 'IN_STOCK',
                inListing: true,
                variantSortIndex: 0,
                sku: `SKU-NDM-${Date.now()}`,
              }),
            ],
          },
        },
      });

      api.session.setCustomerScope();
      const variant = await api.client.variant.get(handle);
      purchasableId = variant.id;
      expect(purchasableId).toBeTruthy();
    });

    await test.step('create checkout and add lines', async () => {
      const { data } = await api.client.checkout.create({
        localeCode: 'uk',
        currencyCode: 'USD',
        items: [],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
      expect(checkoutId).toBeTruthy();

      await api.client.checkout.addLines({
        checkoutId,
        lines: [{ purchasableId, quantity: 1 }],
      });
    });

    await test.step('add delivery address but DO NOT select method', async () => {
      await api.client.checkout.addDeliveryAddresses({
        checkoutId,
        addresses: [
          {
            city: 'Львів',
          } as any,
        ],
      });
      // Intentionally NOT selecting delivery method
    });

    await test.step('create order without selected delivery method', async () => {
      const { data } = await api.client.order.create({ checkoutId });
      const order = data.orderMutation.orderCreate;

      expect(order.id).toBeTruthy();
      expect(order.status).toBe('DRAFT');
    });
  });

  test('creates order exactly like frontend - with customer, novaposhta, metadata', async ({
    api,
  }) => {
    await test.step('setup client and customer scope', async () => {
      await api.session.setupClient();
      api.session.setCustomerScope();
    });

    let checkoutId = '';
    let purchasableId = '';
    const handle = `frontend-like-${Date.now()}`;

    await test.step('create product variant', async () => {
      api.session.setTenantScope();
      await api.admin.product.create({
        input: {
          title: 'Frontend Like Product',
          status: 'PUBLISHED',
          slug: handle,
          groups: [],
          requiresShipping: true,
          tags: [],
          variants: {
            create: [
              api.admin.product.getDefaultVariantInput({
                title: 'Default',
                slug: handle,
                price: 2500,
                stockStatus: 'IN_STOCK',
                inListing: true,
                variantSortIndex: 0,
                sku: `SKU-FL-${Date.now()}`,
              }),
            ],
          },
        },
      });

      api.session.setCustomerScope();
      const variant = await api.client.variant.get(handle);
      purchasableId = variant.id;
    });

    let selectedDeliveryGroupId = '';

    await test.step('create checkout exactly like frontend', async () => {
      // Create checkout with locale 'uk' like frontend
      const { data } = await api.client.checkout.create({
        localeCode: 'uk',
        currencyCode: 'USD',
        items: [],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;

      // Add line
      await api.client.checkout.addLines({
        checkoutId,
        lines: [{ purchasableId, quantity: 1 }],
      });

      // Set customer identity like frontend
      await api.client.checkout.updateCustomerIdentity({
        checkoutId,
        firstName: 'Philipp',
        lastName: 'Sapronov',
        middleName: 'тест',
        phone: '+380333333333',
      });

      // Add delivery address with only city (like Nova Poshta)
      const { data: addrData } = await api.client.checkout.addDeliveryAddresses({
        checkoutId,
        addresses: [
          {
            city: 'Київ',
            data: {
              warehouseRef: '1ec09d88-e1c2-11e3-8c4a-0050568002cf',
              warehouseDescription: 'Відділення №1',
              cityRef: '8d5a980d-391c-11dd-90d9-001a92567626',
            },
          } as any,
        ],
      });

      selectedDeliveryGroupId = addrData.checkoutMutation.checkoutDeliveryAddressesAdd.deliveryGroups[0]?.id;

      // Select novaposhta warehouse_warehouse
      const { data: readData } = await api.client.checkout.readFull(checkoutId);
      const group = readData.checkoutQuery.checkout?.deliveryGroups.find(
        (g) => g.id === selectedDeliveryGroupId,
      );
      const novaposhtaMethod = group?.deliveryMethods.find(
        (m) => m.provider?.code === 'novaposhta' && m.code === 'warehouse_warehouse',
      );

      if (novaposhtaMethod) {
        await api.client.checkout.updateDeliveryMethod({
          checkoutId,
          deliveryGroupId: selectedDeliveryGroupId,
          shippingMethodCode: novaposhtaMethod.code,
          provider: novaposhtaMethod.provider?.code ?? '',
        });
      }

      // Select payment method
      await api.client.checkout.updatePaymentMethod({
        checkoutId,
        paymentMethodCode: 'bank_transfer',
        provider: 'bank_transfer',
      });
    });

    await test.step('create order', async () => {
      const { data } = await api.client.order.create({ checkoutId });
      const order = data.orderMutation.orderCreate;

      expect(order.id).toBeTruthy();
      expect(order.status).toBe('DRAFT');
    });
  });

  test('creates order with customer identity but no delivery address', async ({ api }) => {
    await test.step('setup client and customer scope', async () => {
      await api.session.setupClient();
      api.session.setCustomerScope();
    });

    let checkoutId = '';
    let purchasableId = '';
    const handle = `customer-no-address-${Date.now()}`;

    await test.step('create product variant', async () => {
      api.session.setTenantScope();
      await api.admin.product.create({
        input: {
          title: 'Customer No Address Product',
          status: 'PUBLISHED',
          slug: handle,
          groups: [],
          requiresShipping: true,
          tags: [],
          variants: {
            create: [
              api.admin.product.getDefaultVariantInput({
                title: 'Default',
                slug: handle,
                price: 1800,
                stockStatus: 'IN_STOCK',
                inListing: true,
                variantSortIndex: 0,
                sku: `SKU-CNA-${Date.now()}`,
              }),
            ],
          },
        },
      });

      api.session.setCustomerScope();
      const variant = await api.client.variant.get(handle);
      purchasableId = variant.id;
      expect(purchasableId).toBeTruthy();
    });

    await test.step('create checkout with customer identity', async () => {
      const { data } = await api.client.checkout.create({
        localeCode: 'uk',
        currencyCode: 'USD',
        items: [],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
      expect(checkoutId).toBeTruthy();

      await api.client.checkout.addLines({
        checkoutId,
        lines: [{ purchasableId, quantity: 1 }],
      });

      // Set customer identity
      await api.client.checkout.updateCustomerIdentity({
        checkoutId,
        identity: {
          firstName: 'Тест',
          lastName: 'Користувач',
          phone: '+380501234567',
        },
      });
    });

    await test.step('create order without delivery address', async () => {
      const { data } = await api.client.order.create({ checkoutId });
      const order = data.orderMutation.orderCreate;

      expect(order.id).toBeTruthy();
      expect(order.status).toBe('DRAFT');
    });
  });
});
