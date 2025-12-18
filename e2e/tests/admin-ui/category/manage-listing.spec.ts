import { test } from '@fixtures/base.extend';

test.describe('Categories UI test 2', () => {
  test('Manage Listing / Add products', async ({
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
    await test.step('Check that all products are added and sorted by “Newest” ', async () => {
      await categoriesPage.checkContentDrawer(5);
      await categoriesPage.checkByNewest();
    });
    await test.step('Close Listing Drawer and check Listing Content badge contains number 3', async () => {
      await categoriesPage.closeCategory();
      await categoriesPage.checkListingContentNumber(5);
      await categoriesPage.reloadPage();
    });

    // --- Manage Listing / Check Sort ---

    await test.step('Change to Oldest, open products and check the ordering', async () => {
      await categoriesPage.openEditCategory(categoriesPage.title);
      await categoriesPage.selectOrder('Oldest', 'Newest'); // 'Newest' | 'Oldest' | 'Product title: A-Z' | 'Product title: Z-A' | 'Lowest price' | 'Highest price' | 'Custom'
      await categoriesPage.clickSaveCategories();

      await categoriesPage.checkByOldest();

      await categoriesPage.reloadPage();
    });
    await test.step('Change to Title A-Z, open products and check the ordering', async () => {
      await categoriesPage.openEditCategory(categoriesPage.title);
      await categoriesPage.selectOrder('Newest', 'Product title: A-Z'); // 'Newest' | 'Oldest' | 'Product title: A-Z' | 'Product title: Z-A' | 'Lowest price' | 'Highest price' | 'Custom'
      await categoriesPage.clickSaveCategories();

      await categoriesPage.checkAlphabeticalOrder();

      await categoriesPage.reloadPage();
    });
    await test.step('Change to Title Z-A, open products and check the ordering', async () => {
      await categoriesPage.openEditCategory(categoriesPage.title);
      await categoriesPage.selectOrder('Product title: A-Z', 'Product title: Z-A'); // 'Newest' | 'Oldest' | 'Product title: A-Z' | 'Product title: Z-A' | 'Lowest price' | 'Highest price' | 'Custom'
      await categoriesPage.clickSaveCategories();

      await categoriesPage.checkReverseAlphabeticalOrder();

      await categoriesPage.reloadPage();
    });
    await test.step('Change to Price Lowest, open products and check the ordering', async () => {
      await categoriesPage.openEditCategory(categoriesPage.title);
      await categoriesPage.selectOrder('Product title: Z-A', 'Lowest price'); // 'Newest' | 'Oldest' | 'Product title: A-Z' | 'Product title: Z-A' | 'Lowest price' | 'Highest price' | 'Custom'
      await categoriesPage.clickSaveCategories();

      await categoriesPage.checkLowestPrice();

      await categoriesPage.reloadPage();
    });
    await test.step('Change to Price Highest, open products and check the ordering', async () => {
      await categoriesPage.openEditCategory(categoriesPage.title);
      await categoriesPage.selectOrder('Lowest price', 'Highest price'); // 'Newest' | 'Oldest' | 'Product title: A-Z' | 'Product title: Z-A' | 'Lowest price' | 'Highest price' | 'Custom'
      await categoriesPage.clickSaveCategories();

      await categoriesPage.checkHighestPrice();

      await categoriesPage.reloadPage();
    });
  });
});
