import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

import { composeGlobalId, TypeName } from '@utils/globalid';

test.describe.skip('Cart API', () => {
  test('Create empty cart', async ({ api }) => {
    await api.session.setupClient();
    const { data } = await api.client.cart.create({
      currencyCode: 'USD',
      items: [],
    });
    expect(data?.createCart?.cart?.id).toBeDefined();
    expect(data?.createCart?.cart?.lines.edges).toHaveLength(0);
    expect(data?.createCart?.errors).toBeNull();
  });

  test('Create cart with items', async ({ api }) => {
    await api.session.setupUserAndProject();
    const product = await api.admin.product.create({
      input: {
        title: 'Test Product',
        status: 'PUBLISHED',
        slug: `test-product-${Date.now()}`,
        groups: [],
        requiresShipping: true,
        tags: [],
        variants: {
          create: [
            {
              title: 'Variant',
              price: 100,
              stockStatus: 'IN_STOCK',
              inListing: true,
              categories: [],
              variantSortIndex: 0,
              weight: 0,
              weightUnit: 'g',
            },
          ],
        },
      },
    });

    await api.session.setupApiKey();
    const variantId = product.variants[0].id;
    const { data } = await api.client.cart.create({
      currencyCode: 'USD',
      items: [
        {
          productId: composeGlobalId(TypeName.ProductVariant, variantId),
          quantity: 2,
        },
      ],
    });

    expect(data?.createCart?.cart?.lines.edges).toHaveLength(1);
    expect(data?.createCart?.cart?.lines.edges[0].node.purchasable.iid).toBe(variantId);
  });

  test('Add item to cart', async ({ api }) => {
    await api.session.setupUserAndProject();
    const handle = `test-product-${Date.now()}`;
    await api.admin.product.create({
      input: {
        title: 'Test Product',
        status: 'PUBLISHED',
        slug: handle,
        groups: [],
        requiresShipping: true,
        tags: [],
        variants: {
          create: [
            {
              slug: handle,
              title: 'Variant',
              price: 1000,
              stockStatus: 'IN_STOCK',
              inListing: true,
              categories: [],
              variantSortIndex: 0,
            },
          ],
        },
      },
    });

    await api.session.setupApiKey();
    const product = await api.client.product.get(handle);
    const { data: createData } = await api.client.cart.create({
      currencyCode: 'USD',
      items: [],
    });

    const cartId = createData?.createCart?.cart?.id;
    if (!cartId) {
      throw new Error('Cart not created');
    }

    const { data } = await api.client.cart.addLine({
      cartId: cartId,
      productId: product.id,
      quantity: 1,
    });

    expect(data?.addCartLine?.cart?.lines.edges).toHaveLength(1);
  });

  test('Update cart line quantity', async ({ api }) => {
    await api.session.setupUserAndProject();
    const handle = `test-product-${Date.now()}`;
    await api.admin.product.create({
      input: {
        title: 'Test Product',
        status: 'PUBLISHED',
        slug: `test-product-${Date.now()}`,
        groups: [],
        requiresShipping: true,
        tags: [],
        variants: {
          create: [
            {
              title: 'Variant',
              slug: handle,
              price: 100,
              stockStatus: 'IN_STOCK',
              inListing: true,
              categories: [],
              variantSortIndex: 0,
              weight: 0,
              weightUnit: 'g',
            },
          ],
        },
      },
    });

    await api.session.setupApiKey();
    const product = await api.client.product.get(handle);
    const { data: createData } = await api.client.cart.create({
      currencyCode: 'USD',
      items: [
        {
          productId: product.id,
          quantity: 1,
        },
      ],
    });

    const cartId = createData?.createCart?.cart?.id;
    const cartItemId = createData?.createCart?.cart?.lines.edges[0].node.id;
    if (!cartId || !cartItemId) {
      throw new Error('Cart or cart item not created');
    }

    const { data } = await api.client.cart.updateLineQuantity({
      cartId: cartId,
      cartItemId: cartItemId,
      quantity: 3,
    });

    expect(data?.updateCartLineQuantity?.cart?.lines.edges[0].node.quantity).toBe(3);
  });

  test('Remove item from cart', async ({ api }) => {
    await api.session.setupUserAndProject();
    const handle = `test-product-${Date.now()}`;
    await api.admin.product.create({
      input: {
        title: 'Test Product',
        status: 'PUBLISHED',
        slug: handle,
        groups: [],
        requiresShipping: true,
        tags: [],
        variants: {
          create: [
            {
              title: 'Variant',
              slug: handle,
              price: 100,
              stockStatus: 'IN_STOCK',
              inListing: true,
              categories: [],
              variantSortIndex: 0,
              weight: 0,
              weightUnit: 'g',
            },
          ],
        },
      },
    });

    await api.session.setupApiKey();
    const product = await api.client.product.get(handle);
    const { data: createData } = await api.client.cart.create({
      currencyCode: 'USD',
      items: [
        {
          productId: product.id,
          quantity: 1,
        },
      ],
    });
    const cartId = createData?.createCart?.cart?.id;
    const productId = createData?.createCart?.cart?.lines.edges[0].node.purchasable.id;
    if (!cartId || !productId) {
      throw new Error('Cart or product not created');
    }

    const { data } = await api.client.cart.removeLine({
      cartId: cartId,
      productId: productId,
    });

    expect(data?.removeCartLine?.cart?.lines.edges).toHaveLength(0);
  });

  test('Clear cart lines', async ({ api }) => {
    await api.session.setupUserAndProject();
    const handle = `test-product-${Date.now()}`;
    await api.admin.product.create({
      input: {
        title: 'Test Product',
        status: 'PUBLISHED',
        slug: handle,
        groups: [],
        requiresShipping: true,
        tags: [],
        variants: {
          create: [
            {
              title: 'Variant',
              slug: handle,
              price: 100,
              stockStatus: 'IN_STOCK',
              inListing: true,
              categories: [],
              variantSortIndex: 0,
              weight: 0,
              weightUnit: 'g',
            },
          ],
        },
      },
    });

    await api.session.setupApiKey();
    const product = await api.client.product.get(handle);
    const { data: createData } = await api.client.cart.create({
      currencyCode: 'USD',
      items: [
        {
          productId: product.id,
          quantity: 2,
        },
      ],
    });
    const cartId = createData?.createCart?.cart?.id;
    if (!cartId) {
      throw new Error('Cart not created');
    }

    const { data } = await api.client.cart.clearLines({
      cartId: cartId,
    });
    expect(data?.clearCartLines?.cart?.lines.edges).toHaveLength(0);
  });

  test('Load cart by ID', async ({ api }) => {
    await api.session.setupUserAndProject();
    const handle = `test-product-${Date.now()}`;
    await api.admin.product.create({
      input: {
        title: 'Test Product',
        status: 'PUBLISHED',
        slug: handle,
        groups: [],
        requiresShipping: true,
        tags: [],
        variants: {
          create: [
            {
              title: 'Variant',
              slug: handle,
              price: 100,
              stockStatus: 'IN_STOCK',
              inListing: true,
              categories: [],
              variantSortIndex: 0,
              weight: 0,
              weightUnit: 'g',
            },
          ],
        },
      },
    });

    await api.session.setupApiKey();
    const product = await api.client.product.get(handle);
    const { data: createData } = await api.client.cart.create({
      currencyCode: 'USD',
      items: [
        {
          productId: product.id,
          quantity: 1,
        },
      ],
    });
    const cartId = createData?.createCart?.cart?.id;
    if (!cartId) {
      throw new Error('Cart not created');
    }

    const { data } = await api.client.cart.load({
      cartId,
    });

    expect(data?.loadCart?.cart?.id).toBe(cartId);
  });

  test('Zero price items: add, update quantity, remove with mixed cart', async ({ api }) => {
    await api.session.setupUserAndProject();
    const handle = `test-product-${Date.now()}`;
    const product = await api.admin.product.create({
      input: {
        title: 'Zero Price Test Product',
        status: 'PUBLISHED',
        slug: handle,
        groups: [],
        requiresShipping: true,
        tags: [],
        variants: {
          create: [
            api.admin.product.getDefaultVariantInput({
              title: 'Free Variant',
              slug: `${handle}-free`,
              price: 0,
              stockStatus: 'IN_STOCK',
              inListing: true,
              variantSortIndex: 0,
            }),
            api.admin.product.getDefaultVariantInput({
              title: 'Paid Variant',
              slug: `${handle}-paid`,
              price: 200,
              stockStatus: 'IN_STOCK',
              inListing: true,
              variantSortIndex: 1,
            }),
          ],
        },
      },
    });

    await api.session.setupApiKey();

    const freeVariantId = product.variants[0].id;
    const paidVariantId = product.variants[1].id;

    const freeProductId = composeGlobalId(TypeName.ProductVariant, freeVariantId);
    const paidProductId = composeGlobalId(TypeName.ProductVariant, paidVariantId);

    const { data: createData } = await api.client.cart.create({
      currencyCode: 'USD',
      items: [
        {
          productId: paidProductId,
          quantity: 2,
        },
      ],
    });

    const cartId = createData?.createCart?.cart?.id;
    if (!cartId) throw new Error('Cart not created');

    const initialCart = createData.createCart.cart;
    const pricedLine = initialCart?.lines.edges[0].node;
    const paidUnit = pricedLine?.cost.unitPrice.amount;
    const expectedSubtotal = paidUnit ? paidUnit * pricedLine.quantity : 0;

    expect(initialCart?.cost.subtotalAmount.amount).toBe(expectedSubtotal);
    expect(initialCart?.cost.totalAmount.amount).toBe(expectedSubtotal);

    const { data: addData } = await api.client.cart.addLine({
      cartId,
      productId: freeProductId,
      quantity: 1,
    });

    const afterAdd = addData?.addCartLine.cart;
    const freeLineAfterAdd = afterAdd?.lines.edges.find(
      (e) => e.node.purchasable.id === freeProductId,
    )?.node;
    if (!freeLineAfterAdd) throw new Error('Free line not added');

    expect(freeLineAfterAdd.cost.unitPrice.amount).toBe(0);
    expect(freeLineAfterAdd.cost.totalAmount.amount).toBe(0);
    expect(afterAdd.cost.subtotalAmount.amount).toBe(expectedSubtotal);
    expect(afterAdd.cost.totalAmount.amount).toBe(expectedSubtotal);

    const { data: updateData } = await api.client.cart.updateLineQuantity({
      cartId,
      cartItemId: freeLineAfterAdd.id,
      quantity: 5,
    });

    const afterUpdate = updateData?.updateCartLineQuantity.cart;
    const freeLineAfterUpdate = afterUpdate?.lines.edges.find(
      (e) => e.node.id === freeLineAfterAdd.id,
    )?.node;
    if (!freeLineAfterUpdate) throw new Error('Free line not found after update');

    expect(freeLineAfterUpdate.quantity).toBe(5);
    expect(freeLineAfterUpdate.cost.totalAmount.amount).toBe(0);
    expect(afterUpdate.cost.subtotalAmount.amount).toBe(expectedSubtotal);
    expect(afterUpdate.cost.totalAmount.amount).toBe(expectedSubtotal);

    const { data: removeData } = await api.client.cart.removeLine({
      cartId,
      productId: freeProductId,
    });

    const afterRemove = removeData?.removeCartLine.cart;
    expect(afterRemove?.lines.edges.length).toBe(1);
    expect(afterRemove?.cost.subtotalAmount.amount).toBe(expectedSubtotal);
    expect(afterRemove?.cost.totalAmount.amount).toBe(expectedSubtotal);
  });

  test('Add same item increases quantity by +1 and keeps lines order', async ({ api }) => {
    await api.session.setupUserAndProject();
    const handle = `test-product-${Date.now()}`;
    const product = await api.admin.product.create({
      input: {
        title: 'Test Product',
        status: 'PUBLISHED',
        slug: handle,
        groups: [],
        requiresShipping: true,
        tags: [],
        variants: {
          create: [
            api.admin.product.getDefaultVariantInput({
              title: 'Variant A',
              slug: `${handle}-a`,
              price: 100,
              stockStatus: 'IN_STOCK',
              inListing: true,
              variantSortIndex: 0,
            }),
            api.admin.product.getDefaultVariantInput({
              title: 'Variant B',
              slug: `${handle}-b`,
              price: 200,
              stockStatus: 'IN_STOCK',
              inListing: true,
              variantSortIndex: 1,
            }),
          ],
        },
      },
    });

    await api.session.setupApiKey();
    const variantIdA = product.variants[0].id;
    const variantIdB = product.variants[1].id;

    const productIdA = composeGlobalId(TypeName.ProductVariant, variantIdA);
    const productIdB = composeGlobalId(TypeName.ProductVariant, variantIdB);

    const { data: createData } = await api.client.cart.create({
      currencyCode: 'USD',
      items: [
        {
          productId: productIdA,
          quantity: 1,
        },
        {
          productId: productIdB,
          quantity: 1,
        },
      ],
    });

    const cartId = createData?.createCart?.cart?.id;
    if (!cartId) {
      throw new Error('Cart not created');
    }

    const originalEdges = createData?.createCart?.cart?.lines.edges || [];
    const originalOrder = originalEdges.map((e) => e.node.purchasable.id);

    const cartLineOrders = [];
    for (let quantity = 2; quantity < 20; quantity++) {
      const { data: updateData } = await api.client.cart.updateLineQuantity({
        cartId,
        cartItemId: originalEdges[0].node.id,
        quantity,
      });

      cartLineOrders.push(
        updateData?.updateCartLineQuantity.cart?.lines.edges?.map((e) => e.node.purchasable.id),
      );
    }

    cartLineOrders.forEach((order) => {
      expect(order).toEqual(originalOrder);
    });
  });
});
