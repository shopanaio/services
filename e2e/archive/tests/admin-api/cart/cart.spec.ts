import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Admin Cart API', () => {
  test('find many carts returns all created carts', async ({ api }) => {
    await api.session.setupUserAndProject();
    await api.session.setupApiKey();

    const createdCartIids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const {
        data: { createCart },
      } = await api.client.cart.create({
        currencyCode: 'USD',
        items: [],
      });
      if (createCart?.cart?.iid) createdCartIids.push(createCart.cart.iid);
    }

    const { data } = await api.admin.query('admin/CartFindMany', {
      variables: { input: {} },
    });

    const carts = data.cartQuery.findMany.data;
    const meta = data.cartQuery.findMany.meta;

    expect(meta.total).toBeGreaterThanOrEqual(3);
    for (const iid of createdCartIids) {
      expect(carts.some((c) => c.id === iid)).toBe(true);
    }
  });

  test('find one cart returns the cart', async ({ api }) => {
    await api.session.setupUserAndProject();
    await api.session.setupApiKey();

    const {
      data: { createCart },
    } = await api.client.cart.create({
      currencyCode: 'USD',
      items: [],
    });

    const cartIid = createCart?.cart?.iid as string;
    expect(cartIid).toBeTruthy();

    const { data } = await api.admin.query('admin/CartFindOne', {
      variables: { id: cartIid },
    });

    expect(data.cartQuery.findOne?.id).toBe(cartIid);
  });

  test('delete cart removes it from admin API', async ({ api }) => {
    await api.session.setupUserAndProject();
    await api.session.setupApiKey();

    const {
      data: { createCart },
    } = await api.client.cart.create({
      currencyCode: 'USD',
      items: [],
    });

    const { data: deleteData } = await api.admin.mutation('admin/CartDelete', {
      variables: { id: createCart?.cart?.iid },
    });
    expect(deleteData.cartMutation.delete).toBe(true);

    const { data: findOneAfter } = await api.admin.query('admin/CartFindOne', {
      variables: { id: createCart?.cart?.iid },
    });
    expect(findOneAfter.cartQuery.findOne).toBeNull();
  });
});
