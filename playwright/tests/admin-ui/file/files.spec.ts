import { test } from '@fixtures/base.extend';

test.describe('Files UI', () => {
  test('Files create', async ({
    api,
    storesPage,
    signInPage,
    productsPage,
    filesPage,
    categoriesPage,
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

    await test.step('Open files', async () => {
      await filesPage.openFiles();
    })

    await test.step('Drop photo to dropzone', async () => {
      await filesPage.clickCreate();
      await filesPage.dropPhotoToDropzone('fixtures/images/vase.jpg');
      await filesPage.dropPhotoToDropzone('fixtures/images/lamp.jpg');
    });

    await test.step('Check photo uploaded', async () => {
      await filesPage.checkUploadedImg(0);
      await filesPage.checkUploadedImg(1);
    });

    await test.step('Open products and add one img in product', async () => {
      await productsPage.openProducts();
      await productsPage.openCreate();
      await productsPage.fillProductName('Product');
      await productsPage.clickUploadCover();
      await productsPage.uploadFromFiles('vase.jpg');
      await productsPage.clickOkInModalBrowseFiles();
      await productsPage.saveAndExitProduct();
    });

    await test.step('Open categories and add one img in category', async () => {
      await categoriesPage.openCategories();
      await categoriesPage.openCreate();
      await categoriesPage.fillCategoriesTitle('Category');
      await categoriesPage.clickUploadCover();
      await categoriesPage.uploadFromFiles('lamp.jpg');
      await categoriesPage.clickOkInModalBrowseFiles();
      await categoriesPage.saveAndExitCategory();
    });

    await test.step('Search and filter', async () => {
      await filesPage.openFiles();

      await filesPage.fillSearch('vase');
      await filesPage.checkSearchResult('vase.jpg');

      await filesPage.fillSearch('');

      await filesPage.clickSortByName();
      await filesPage.checkSortingByNameAscending();

      await filesPage.clickSortByName();
      await filesPage.checkSortingByNameDescending();

      await filesPage.clickFilter();
      await filesPage.selectRowInFilter('Categories that use this file');
      await filesPage.clickFilterSelect('category');
      await filesPage.browseFilterCategory(0);
      await filesPage.clickOkInModalBrowseCategories();
      await filesPage.checkSearchResult('lamp.jpg');

      await filesPage.reloadPage();

      await filesPage.clickFilter();
      await filesPage.selectRowInFilter('Products that use this file');
      await filesPage.clickFilterSelect('product');
      await filesPage.browseFilterProduct(0);
      await filesPage.clickOkInModalBrowseProducts();
      await filesPage.checkSearchResult('vase.jpg');
    });
  });
});
