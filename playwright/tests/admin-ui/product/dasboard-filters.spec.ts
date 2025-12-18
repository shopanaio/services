import { test } from '@fixtures/base.extend';

test.describe('Product-filter UI', () => {
  test('Product-filter', async ({ api, storesPage, signInPage, productsPage }) => {
    await test.step('Create a user and login', async () => {
      await test.step('Create a new user with a store', async () => {
        await api.session.setupUserAndProject();
      });
      await test.step('LogIn', async () => {
        await signInPage.signIn(api.session.user.data.email, api.session.user.data.password);
        await storesPage.waitFor();
        await storesPage.openProject();
      })
    });

    await test.step('Create 5 products with different prices, stock status', async () => {
      for (const product of productsPage.products) {
        await productsPage.openCreate();
        await productsPage.fillProductName(product.title);
        await productsPage.fillProductPrice(product.price);
        await productsPage.saveAndExitProduct();
      }
    });

    await test.step('Sort by title and check', async () => {
      await productsPage.clickSortBy('Title');
      await productsPage.checkAlphabeticalOrder();

      await productsPage.clickSortBy('Title');
      await productsPage.checkReverseAlphabeticalOrder();
    });

    await test.step('Sort by price and check', async () => {
      await productsPage.clickSortBy('Price');
      await productsPage.checkLowestPrice();

      await productsPage.clickSortBy('Price');
      await productsPage.checkHighestPrice();
    });
  });
});
