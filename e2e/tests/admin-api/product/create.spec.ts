import { test } from '@fixtures/base.extend';



test.describe('ProductCreate', () => {
  test('Create', async ({ api }) => {
    
    await api.session.setupUserAndProject();

    
    const product = await api.admin.product.create();

    
    api.admin.product.assertProduct(product);
  });
});
