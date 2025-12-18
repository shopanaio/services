import { test } from '@fixtures/base.extend';

// FIXME: This test is not working as expected.
test.describe('Category-filter', () => {
  test('Category-filter', async ({
    api,
    storesPage,
    signInPage,
    categoriesPage,
    productsPage,
  }) => {
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

    await test.step('Create 5 categories', async () => {
      await categoriesPage.openCategories();

      for (const category of categoriesPage.categories) {
        await categoriesPage.openCreate();
        await categoriesPage.fillCategoriesTitle(category);
        await categoriesPage.saveAndExitCategory();
      }
    });

    await test.step('Sort by title and check', async () => {
      await productsPage.clickSortBy('Title');
      await productsPage.checkAlphabeticalOrder();

      await productsPage.clickSortBy('Title');
      await productsPage.checkReverseAlphabeticalOrder();
    });
  });
});
