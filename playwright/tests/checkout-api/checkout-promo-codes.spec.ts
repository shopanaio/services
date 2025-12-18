import { EntityStatus } from '@codegen/admin-gql';
import { ApiCheckoutLine, CurrencyCode } from '@codegen/client-gql';
import { test } from '@fixtures/api/api';
import { expect } from '@playwright/test';

test.describe('checkout-api: promo codes management', () => {
  test('should handle promo code addition with validation', async ({ api }) => {
    await test.step('setup client (tenant, project, apiKey) and customer scope', async () => {
      await api.session.setupClient();
      api.session.setCustomerScope();
    });

    let checkoutId = '';
    let purchasableId = '';

    await test.step('create checkout with items', async () => {
      // First create a product to have something in the checkout
      api.session.setTenantScope();
      const handle = `test-product-promo-${Date.now()}`;
      await api.admin.product.create({
        input: {
          title: 'Promo Test Product',
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
                price: 10000, // $100.00
                stockStatus: 'IN_STOCK',
                inListing: true,
                variantSortIndex: 0,
                sku: 'SKU-PROMO-1',
              }),
            ],
          },
        },
      });

      // Fetch product from client API to get correct purchasable ID (base64 encoded)
      api.session.setCustomerScope();
      const variant = await api.client.variant.get(handle);
      purchasableId = variant.id;

      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: CurrencyCode.Usd,
        items: [],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
      expect(checkoutId).toBeTruthy();

      await api.client.checkout.addLines({
        checkoutId,
        lines: [{ purchasableId, quantity: 5 }],
      });

      expect(data.checkoutMutation.checkoutCreate.appliedPromoCodes.length).toBe(0);

      // Store initial amounts for comparison
      const initialCheckout = await api.client.checkout.read(checkoutId);
      const checkout = initialCheckout.data.checkoutQuery.checkout;
      expect(checkout).toBeTruthy();

      if (!checkout) {
        throw new Error('Checkout not found');
      }

      const initialCost = checkout.cost;

      // Initial amounts: 5 items × $100 = $500 subtotal
      expect(initialCost.subtotalAmount.amount).toBe(500); // $500.00 in cents
      expect(initialCost.totalDiscountAmount.amount).toBe(0); // No discount initially
      expect(initialCost.totalAmount.amount).toBe(500); // $500.00 total initially
    });

    await test.step('add promo code', async () => {
      const promoCode = 'SAVE50';

      const response = await api.client.checkout.addPromoCode({
        checkoutId,
        code: promoCode,
      });

      const updatedCheckout = response.data.checkoutMutation.checkoutPromoCodeAdd;
      expect(updatedCheckout.appliedPromoCodes.length).toBe(1);
      expect(updatedCheckout.appliedPromoCodes[0].code).toBe(promoCode);

      // Check amounts after applying 50% discount promo code
      expect(updatedCheckout.cost.subtotalAmount.amount).toBe(500); // Subtotal stays $500.00
      expect(updatedCheckout.cost.totalDiscountAmount.amount).toBe(250); // 50% discount = $250.00
      expect(updatedCheckout.cost.totalAmount.amount).toBe(250); // Final total = $500 - $250 = $250.00
    });

    await test.step('remove promo code', async () => {
      const { data } = await api.client.checkout.removePromoCode({
        checkoutId,
        code: 'SAVE50',
      });

      const updatedCheckout = data.checkoutMutation.checkoutPromoCodeRemove;
      expect(updatedCheckout.appliedPromoCodes.length).toBe(0);

      // Check amounts after removing promo code - should return to original values
      expect(updatedCheckout.cost.subtotalAmount.amount).toBe(500); // Subtotal stays $500.00
      expect(updatedCheckout.cost.totalDiscountAmount.amount).toBe(0); // No discount after removal
      expect(updatedCheckout.cost.totalAmount.amount).toBe(500); // Total back to $500.00
    });
  });

  test('should recalculate promo code discount when adding new items', async ({ api }) => {
    await test.step('setup client (tenant, project, apiKey) and customer scope', async () => {
      await api.session.setupClient();
      api.session.setCustomerScope();
    });

    let checkoutId = '';
    let purchasableId1 = '';
    let purchasableId2 = '';

    await test.step('create checkout with initial items and apply promo code', async () => {
      api.session.setTenantScope();

      // Create first product
      const handle1 = `test-product-promo-1-${Date.now()}`;
      await api.admin.product.create({
        input: {
          title: 'Promo Test Product 1',
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
                price: 10000, // $100.00
                stockStatus: 'IN_STOCK',
                inListing: true,
                variantSortIndex: 0,
                sku: 'SKU-PROMO-1',
              }),
            ],
          },
        },
      });

      // Create second product
      const handle2 = `test-product-promo-2-${Date.now()}`;
      await api.admin.product.create({
        input: {
          title: 'Promo Test Product 2',
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
                price: 8000, // $80.00
                stockStatus: 'IN_STOCK',
                inListing: true,
                variantSortIndex: 0,
                sku: 'SKU-PROMO-2',
              }),
            ],
          },
        },
      });

      // Fetch products from client API to get correct purchasable IDs (base64 encoded)
      api.session.setCustomerScope();
      const variant1 = await api.client.variant.get(handle1);
      const variant2 = await api.client.variant.get(handle2);
      purchasableId1 = variant1.id;
      purchasableId2 = variant2.id;

      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: CurrencyCode.Usd,
        items: [],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
      expect(checkoutId).toBeTruthy();

      await api.client.checkout.addLines({
        checkoutId,
        lines: [{ purchasableId: purchasableId1, quantity: 3 }],
      });

      // Apply promo code to initial checkout (3 × $100 = $300)
      const promoResponse = await api.client.checkout.addPromoCode({
        checkoutId,
        code: 'SAVE50',
      });

      const checkoutWithPromo = promoResponse.data.checkoutMutation.checkoutPromoCodeAdd;
      expect(checkoutWithPromo.cost.subtotalAmount.amount).toBe(300); // $300.00 subtotal
      expect(checkoutWithPromo.cost.totalDiscountAmount.amount).toBe(150); // 50% discount = $150.00
      expect(checkoutWithPromo.cost.totalAmount.amount).toBe(150); // Final total = $150.00
    });

    await test.step('add new items and verify discount recalculation', async () => {
      // Add 3 units of second product ($80 each)
      await api.client.checkout.addLines({
        checkoutId,
        lines: [{ purchasableId: purchasableId2, quantity: 3 }],
      });

      // Verify the checkout after adding items
      const updatedCheckout = await api.client.checkout.read(checkoutId);

      const checkout = updatedCheckout.data.checkoutQuery.checkout;
      expect(checkout).toBeTruthy();

      if (!checkout) {
        throw new Error('Checkout not found');
      }

      // New totals: (3 × $100) + (3 × $80) = $300 + $240 = $540 subtotal
      expect(checkout.cost.subtotalAmount.amount).toBe(540); // $540.00 subtotal
      expect(checkout.cost.totalDiscountAmount.amount).toBe(270); // 50% discount = $270.00
      expect(checkout.cost.totalAmount.amount).toBe(270); // Final total = $270.00

      // Verify promo code is still applied
      expect(checkout.appliedPromoCodes.length).toBe(1);
      expect(checkout.appliedPromoCodes[0].code).toBe('SAVE50');
    });
  });

  test('should recalculate promo code discount when updating item quantities', async ({ api }) => {
    await test.step('setup client (tenant, project, apiKey) and customer scope', async () => {
      await api.session.setupClient();
      api.session.setCustomerScope();
    });

    let checkoutId = '';
    let purchasableId = '';
    let lineId = '';

    await test.step('create checkout with items and apply promo code', async () => {
      api.session.setTenantScope();
      const handle = `test-product-update-qty-${Date.now()}`;
      await api.admin.product.create({
        input: {
          title: 'Promo Test Product for Quantity Update',
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
                price: 5000, // $50.00
                stockStatus: 'IN_STOCK',
                inListing: true,
                variantSortIndex: 0,
                sku: 'SKU-UPDATE-QTY',
              }),
            ],
          },
        },
      });

      // Fetch product from client API to get correct purchasable ID (base64 encoded)
      api.session.setCustomerScope();
      const variant = await api.client.variant.get(handle);
      purchasableId = variant.id;
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: CurrencyCode.Usd,
        items: [],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;

      await api.client.checkout.addLines({
        checkoutId,
        lines: [{ purchasableId, quantity: 6 }],
      });

      // Apply promo code (6 × $50 = $300)
      const promoResponse = await api.client.checkout.addPromoCode({
        checkoutId,
        code: 'SAVE50',
      });

      const checkoutWithPromo = promoResponse.data.checkoutMutation.checkoutPromoCodeAdd;
      const line = checkoutWithPromo.lines.find(
        (l: ApiCheckoutLine) => l.purchasableId === purchasableId,
      );
      if (!line) {
        throw new Error('Checkout line not found by purchasableId');
      }
      lineId = line.id;

      expect(checkoutWithPromo.cost.subtotalAmount.amount).toBe(300); // $300.00 subtotal
      expect(checkoutWithPromo.cost.totalDiscountAmount.amount).toBe(150); // 50% discount = $150.00
      expect(checkoutWithPromo.cost.totalAmount.amount).toBe(150); // Final total = $150.00
    });

    await test.step('update item quantity and verify discount recalculation', async () => {
      // Update quantity from 6 to 8
      await api.client.checkout.updateLines({
        checkoutId,
        lines: [{ lineId, quantity: 8 }],
      });

      const updatedCheckout = await api.client.checkout.read(checkoutId);

      const checkout = updatedCheckout.data.checkoutQuery.checkout;
      expect(checkout).toBeTruthy();

      if (!checkout) {
        throw new Error('Checkout not found');
      }

      // New totals: 8 × $50 = $400 subtotal
      expect(checkout.cost.subtotalAmount.amount).toBe(400); // $400.00 subtotal
      expect(checkout.cost.totalDiscountAmount.amount).toBe(200); // 50% discount = $200.00
      expect(checkout.cost.totalAmount.amount).toBe(200); // Final total = $200.00

      // Verify promo code is still applied
      expect(checkout.appliedPromoCodes.length).toBe(1);
      expect(checkout.appliedPromoCodes[0].code).toBe('SAVE50');
    });

    await test.step('decrease item quantity and verify discount recalculation', async () => {
      // Update quantity from 8 to 2
      await api.client.checkout.updateLines({
        checkoutId,
        lines: [{ lineId, quantity: 2 }],
      });

      const updatedCheckout = await api.client.checkout.read(checkoutId);

      const checkout = updatedCheckout.data.checkoutQuery.checkout;
      expect(checkout).toBeTruthy();

      if (!checkout) {
        throw new Error('Checkout not found');
      }

      // New totals: 2 × $50 = $100 subtotal, which is below the $300 minimum
      expect(checkout.cost.subtotalAmount.amount).toBe(100); // $100.00 subtotal
      expect(checkout.cost.totalDiscountAmount.amount).toBe(0); // Discount removed
      expect(checkout.cost.totalAmount.amount).toBe(100); // Final total = $100.00

      // Verify promo code is still applied but has no effect
      expect(checkout.appliedPromoCodes.length).toBe(1);
      expect(checkout.appliedPromoCodes[0].code).toBe('SAVE50');
    });
  });

  test('should recalculate promo code discount when removing items', async ({ api }) => {
    await test.step('setup client (tenant, project, apiKey) and customer scope', async () => {
      await api.session.setupClient();
      api.session.setCustomerScope();
    });

    let checkoutId = '';
    let purchasableId1 = '';
    let purchasableId2 = '';
    let lineId1 = '';
    let lineId2 = '';

    await test.step('create checkout with multiple items and apply promo code', async () => {
      api.session.setTenantScope();

      // Create first product
      const handle1 = `test-product-remove-1-${Date.now()}`;
      await api.admin.product.create({
        input: {
          title: 'Promo Test Product 1 for Removal',
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
                price: 6000, // $60.00
                stockStatus: 'IN_STOCK',
                inListing: true,
                variantSortIndex: 0,
                sku: 'SKU-REMOVE-1',
              }),
            ],
          },
        },
      });

      // Create second product
      const handle2 = `test-product-remove-2-${Date.now()}`;
      await api.admin.product.create({
        input: {
          title: 'Promo Test Product 2 for Removal',
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
                price: 4000, // $40.00
                stockStatus: 'IN_STOCK',
                inListing: true,
                variantSortIndex: 0,
                sku: 'SKU-REMOVE-2',
              }),
            ],
          },
        },
      });

      // Fetch products from client API to get correct purchasable IDs (base64 encoded)
      api.session.setCustomerScope();
      const variant1 = await api.client.variant.get(handle1);
      const variant2 = await api.client.variant.get(handle2);
      purchasableId1 = variant1.id;
      purchasableId2 = variant2.id;

      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: CurrencyCode.Usd,
        items: [],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;

      await api.client.checkout.addLines({
        checkoutId,
        lines: [
          { purchasableId: purchasableId1, quantity: 3 },
          { purchasableId: purchasableId2, quantity: 5 },
        ],
      });

      // Apply promo code to initial checkout
      // (3 × $60) + (5 × $40) = $180 + $200 = $380
      const promoResponse = await api.client.checkout.addPromoCode({
        checkoutId,
        code: 'SAVE50',
      });

      const checkoutWithPromo = promoResponse.data.checkoutMutation.checkoutPromoCodeAdd;
      const lineForPurchasable1 = checkoutWithPromo.lines.find(
        (l: ApiCheckoutLine) => l.purchasableId === purchasableId1,
      );
      const lineForPurchasable2 = checkoutWithPromo.lines.find(
        (l: ApiCheckoutLine) => l.purchasableId === purchasableId2,
      );
      if (!lineForPurchasable1 || !lineForPurchasable2) {
        throw new Error('Checkout line not found by purchasableId');
      }
      lineId1 = lineForPurchasable1.id;
      lineId2 = lineForPurchasable2.id;
      expect(checkoutWithPromo.cost.subtotalAmount.amount).toBe(380); // $380.00 subtotal
      expect(checkoutWithPromo.cost.totalDiscountAmount.amount).toBe(190); // 50% discount = $190.00
      expect(checkoutWithPromo.cost.totalAmount.amount).toBe(190); // Final total = $190.00
    });

    await test.step('remove one item type and verify discount recalculation', async () => {
      // Remove all units of first product (keeping only second product)
      await api.client.checkout.deleteLines({
        checkoutId,
        lineIds: [lineId1],
      });

      const updatedCheckout = await api.client.checkout.read(checkoutId);

      const checkout = updatedCheckout.data.checkoutQuery.checkout;
      expect(checkout).toBeTruthy();

      if (!checkout) {
        throw new Error('Checkout not found');
      }

      // Remaining: 5 × $40 = $200 subtotal, which is below the $300 minimum
      expect(checkout.cost.subtotalAmount.amount).toBe(200); // $200.00 subtotal
      expect(checkout.cost.totalDiscountAmount.amount).toBe(0); // Discount removed
      expect(checkout.cost.totalAmount.amount).toBe(200); // Final total = $200.00

      // Verify promo code is still applied but has no effect
      expect(checkout.appliedPromoCodes.length).toBe(1);
      expect(checkout.appliedPromoCodes[0].code).toBe('SAVE50');
    });

    await test.step('remove remaining items and verify empty cart behavior', async () => {
      // Remove all remaining items
      await api.client.checkout.deleteLines({
        checkoutId,
        lineIds: [lineId2],
      });

      const updatedCheckout = await api.client.checkout.read(checkoutId);

      const checkout = updatedCheckout.data.checkoutQuery.checkout;
      expect(checkout).toBeTruthy();

      if (!checkout) {
        throw new Error('Checkout not found');
      }

      // Empty cart totals
      expect(checkout.cost.subtotalAmount.amount).toBe(0); // $0.00 subtotal
      expect(checkout.cost.totalDiscountAmount.amount).toBe(0); // No discount on empty cart
      expect(checkout.cost.totalAmount.amount).toBe(0); // Final total = $0.00

      // Verify promo code is still applied but has no effect
      expect(checkout.appliedPromoCodes.length).toBe(1);
      expect(checkout.appliedPromoCodes[0].code).toBe('SAVE50');
    });
  });

  test('should handle complex item operations with promo code correctly', async ({ api }) => {
    await test.step('setup client (tenant, project, apiKey) and customer scope', async () => {
      await api.session.setupClient();
      api.session.setCustomerScope();
    });

    let checkoutId = '';
    let purchasableId1 = '';
    let purchasableId2 = '';
    let purchasableId3 = '';
    let lineId1 = '';
    let lineId2 = '';
    let lineId3 = '';

    await test.step('create checkout and products for complex operations', async () => {
      api.session.setTenantScope();

      // Create three different products
      const timestamp = Date.now();
      const handleA = `product-a-${timestamp}`;
      const handleB = `product-b-${timestamp}`;
      const handleC = `product-c-${timestamp}`;

      await Promise.all([
        api.admin.product.create({
          input: {
            title: 'Product A',
            status: EntityStatus.Published,
            slug: handleA,
            groups: [],
            requiresShipping: true,
            tags: [],
            variants: {
              create: [
                api.admin.product.getDefaultVariantInput({
                  title: 'Variant A',
                  slug: handleA,
                  price: 10000, // $100.00
                  stockStatus: 'IN_STOCK',
                  inListing: true,
                  variantSortIndex: 0,
                  sku: 'SKU-A',
                }),
              ],
            },
          },
        }),
        api.admin.product.create({
          input: {
            title: 'Product B',
            status: EntityStatus.Published,
            slug: handleB,
            groups: [],
            requiresShipping: true,
            tags: [],
            variants: {
              create: [
                api.admin.product.getDefaultVariantInput({
                  title: 'Variant B',
                  slug: handleB,
                  price: 15000, // $150.00
                  stockStatus: 'IN_STOCK',
                  inListing: true,
                  variantSortIndex: 0,
                  sku: 'SKU-B',
                }),
              ],
            },
          },
        }),
        api.admin.product.create({
          input: {
            title: 'Product C',
            status: EntityStatus.Published,
            slug: handleC,
            groups: [],
            requiresShipping: true,
            tags: [],
            variants: {
              create: [
                api.admin.product.getDefaultVariantInput({
                  title: 'Variant C',
                  slug: handleC,
                  price: 7500, // $75.00
                  stockStatus: 'IN_STOCK',
                  inListing: true,
                  variantSortIndex: 0,
                  sku: 'SKU-C',
                }),
              ],
            },
          },
        }),
      ]);

      // Fetch products from client API to get correct purchasable IDs (base64 encoded)
      api.session.setCustomerScope();
      const variantA = await api.client.variant.get(handleA);
      const variantB = await api.client.variant.get(handleB);
      const variantC = await api.client.variant.get(handleC);

      purchasableId1 = variantA.id;
      purchasableId2 = variantB.id;
      purchasableId3 = variantC.id;

      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: CurrencyCode.Usd,
        items: [],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;

      await api.client.checkout.addLines({
        checkoutId,
        lines: [{ purchasableId: purchasableId1, quantity: 2 }],
      });
    });

    await test.step('apply promo code and perform complex operations', async () => {
      // Initial: 2 × $100 = $200
      let checkoutResponse = await api.client.checkout.read(checkoutId);
      let checkout = checkoutResponse.data.checkoutQuery.checkout;
      if (!checkout) {
        throw new Error('Checkout not found');
      }
      expect(checkout?.cost.subtotalAmount.amount).toBe(200);

      const line1 = checkout.lines.find((l: ApiCheckoutLine) => l.purchasableId === purchasableId1);
      expect(line1).toBeDefined();
      lineId1 = (line1 as ApiCheckoutLine).id;

      // Apply 50% promo code
      await api.client.checkout.addPromoCode({
        checkoutId,
        code: 'SAVE50',
      });

      // Step 1: Add Product B (3 × $150)
      await api.client.checkout.addLines({
        checkoutId,
        lines: [{ purchasableId: purchasableId2, quantity: 3 }],
      });

      checkoutResponse = await api.client.checkout.read(checkoutId);
      checkout = checkoutResponse.data.checkoutQuery.checkout;
      if (!checkout) {
        throw new Error('Checkout not found');
      }

      const line2 = checkout.lines.find((l: ApiCheckoutLine) => l.purchasableId === purchasableId2);
      expect(line2).toBeDefined();
      lineId2 = (line2 as ApiCheckoutLine).id;

      // Total: (2 × $100) + (3 × $150) = $200 + $450 = $650
      expect(checkout?.cost.subtotalAmount.amount).toBe(650);
      expect(checkout?.cost.totalDiscountAmount.amount).toBe(325); // 50% = $325.00
      expect(checkout?.cost.totalAmount.amount).toBe(325);

      // Step 2: Update Product A quantity from 2 to 5
      await api.client.checkout.updateLines({
        checkoutId,
        lines: [{ lineId: lineId1, quantity: 5 }],
      });

      // Step 3: Add Product C (4 × $75)
      await api.client.checkout.addLines({
        checkoutId,
        lines: [{ purchasableId: purchasableId3, quantity: 4 }],
      });

      checkoutResponse = await api.client.checkout.read(checkoutId);
      checkout = checkoutResponse.data.checkoutQuery.checkout;
      if (!checkout) {
        throw new Error('Checkout not found');
      }

      const line3 = checkout.lines.find((l: ApiCheckoutLine) => l.purchasableId === purchasableId3);
      expect(line3).toBeDefined();
      lineId3 = (line3 as ApiCheckoutLine).id;

      // Total: (5 × $100) + (3 × $150) + (4 × $75) = $500 + $450 + $300 = $1250
      expect(checkout?.cost.subtotalAmount.amount).toBe(1250);
      expect(checkout?.cost.totalDiscountAmount.amount).toBe(625); // 50% = $625.00
      expect(checkout?.cost.totalAmount.amount).toBe(625);

      // Step 4: Remove Product B entirely
      await api.client.checkout.deleteLines({
        checkoutId,
        lineIds: [lineId2],
      });

      checkoutResponse = await api.client.checkout.read(checkoutId);
      checkout = checkoutResponse.data.checkoutQuery.checkout;

      // Total: (5 × $100) + (4 × $75) = $500 + $300 = $800
      expect(checkout?.cost.subtotalAmount.amount).toBe(800);
      expect(checkout?.cost.totalDiscountAmount.amount).toBe(400); // 50% = $400.00
      expect(checkout?.cost.totalAmount.amount).toBe(400);

      // Step 5: Update Product C quantity from 4 to 1
      await api.client.checkout.updateLines({
        checkoutId,
        lines: [{ lineId: lineId3, quantity: 1 }],
      });

      checkoutResponse = await api.client.checkout.read(checkoutId);
      checkout = checkoutResponse.data.checkoutQuery.checkout;

      // Total: (5 × $100) + (1 × $75) = $500 + $75 = $575
      expect(checkout?.cost.subtotalAmount.amount).toBe(575);
      expect(checkout?.cost.totalDiscountAmount.amount).toBe(287.5); // 50% = $287.50
      expect(checkout?.cost.totalAmount.amount).toBe(287.5);

      // Verify promo code is still applied throughout all operations
      expect(checkout?.appliedPromoCodes.length).toBe(1);
      expect(checkout?.appliedPromoCodes[0].code).toBe('SAVE50');
    });
  });
});
