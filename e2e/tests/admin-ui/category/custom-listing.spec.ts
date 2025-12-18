import { test } from '@fixtures/base.extend';

test.describe('Categories UI', () => {
  test('Custom Listing / Delete products', async ({
    api,
    storesPage,
    productsPage,
    categoriesPage,
    signInPage,
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

    await test.step('Create 3 products', async () => {
      for (let i = 0; i < categoriesPage.products.length; i++) {
        await productsPage.openCreate();
        await productsPage.fillProductName(categoriesPage.products[i].title);
        await productsPage.fillProductPrice(categoriesPage.products[i].price);

        if (i === categoriesPage.products.length - 1) {
          const sizes = categoriesPage.products[i].sizes;

          await productsPage.clickAddOptions();
          await productsPage.fillFeaturesTitle('size', false);

          if (sizes) {
            await productsPage.timeout(1);

            await productsPage.addFeature(sizes[0]);
            await productsPage.addFeature(sizes[1]);
            await productsPage.addFeature(sizes[2]);
          }

          await productsPage.clickDoneOptions();
          await productsPage.variantsSettings(3);
        }

        await productsPage.saveAndExitProduct();
      }
    });

    await test.step('Create category with a title, reload and open', async () => {
      await categoriesPage.openCategories();

      await categoriesPage.openCreate();
      await categoriesPage.fillCategoriesTitle(categoriesPage.title);
      await categoriesPage.saveAndExitCategory();
      await categoriesPage.reloadPage();

      await categoriesPage.openEditCategory(categoriesPage.title);
    });
    await test.step('Open Manage Content drawer and check it is empty', async () => {
      await categoriesPage.checkContentDrawer(0);
    });
    await test.step('Click add products, check all rows and click OK', async () => {
      await categoriesPage.clickAddProduct();
      await categoriesPage.manageContentAddProd(categoriesPage.products.length);
      await categoriesPage.clickOkInModalBrowseProducts();
    });

    await test.step('Change to Custom, open products Save the current order', async () => {
      await categoriesPage.selectOrder(
        'Oldest',
        'Custom',
      ); // 'Newest' | 'Oldest' | 'Product title: A-Z' | 'Product title: Z-A' | 'Lowest price' | 'Highest price' | 'Custom'
      await categoriesPage.clickSaveCategories();
    });
    await test.step('Move 1-2, 2-3 Check that 1 item is the last one', async () => {
      await categoriesPage.scrollToProduct();

      await categoriesPage.dragProduct(0, 1);
      await categoriesPage.dragProduct(1, 2);

      await categoriesPage.checkFirstProductIsLast();
    });
    await test.step('Move 3-2, 2-1 Check that last item is first again', async () => {
      await categoriesPage.dragProduct(2, 1);
      await categoriesPage.dragProduct(1, 0);

      await categoriesPage.checkFirstProductIsFirst();
    });

    // --- Manage Listing / Delete items ---

    await test.step('Delete one product which is without variants, check that its disappeared', async () => {
      await categoriesPage.takeCountOfProducts();
      await categoriesPage.deleteProduct(0, 1);
      await categoriesPage.checkContentDrawer(categoriesPage.countOfProducts);
    });
    await test.step('Open next product without variants, remove category, save, close, and check that it disappears', async () => {
      await categoriesPage.openProductInManageContent(0);
      await categoriesPage.deleteCategoryFromProduct();
      await productsPage.saveAndExitProduct();
      await categoriesPage.checkContentDrawer(categoriesPage.countOfProducts);
    });
    await test.step('Open next product which is a variant, uncheck InListing, save, check that it disappears', async () => {
      await categoriesPage.openProductInManageContent(0);
      await categoriesPage.takeCountOfProducts();
      await categoriesPage.uncheckInListing(1);
      await productsPage.saveAndExitProduct();
      await categoriesPage.checkContentDrawer(categoriesPage.countOfProducts);
    });
    await test.step('Click close on one of the last 2 products, check that modal says about 2 products to be removed', async () => {
      await categoriesPage.deleteProduct(0, 2);
    });
    await test.step('Click Ok and check that list is now empty', async () => {
      await categoriesPage.checkContentDrawer(0);
    });
  })
});
