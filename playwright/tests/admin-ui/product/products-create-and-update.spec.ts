import { test } from '@fixtures/base.extend';

test.describe('Products UI test 1', () => {
  test('Products Create/Update', async ({
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

    await test.step('Create product and category', async () => {
      await productsPage.openCreate();
      await productsPage.clickUploadCover();

      await productsPage.uploadCover(
        'https://upload.wikimedia.org/wikipedia/commons/b/b8/Chinese_vase.jpg',
      );
      await productsPage.saveProduct();
      await productsPage.reloadPage();

      await categoriesPage.openCategories();

      await categoriesPage.openCreate();
      await categoriesPage.fillCategoriesTitle(categoriesPage.title);
      await categoriesPage.clickSaveCategories();
      await categoriesPage.reloadPage();

      await productsPage.openProducts();
      await productsPage.openEditProduct('Untitled');
    });

    /* ---- Update ---- */

    await test.step('Change title and check that api handle didn’t change', async () => {
      await productsPage.fillProductName(productsPage.title);
      await productsPage.checkSlug();
    });
    await test.step('Sync api handle and check that it has been changed according to current title', async () => {
      await productsPage.syncSlug();
    });
    await test.step('Change title and check that slug is in sync with title', async () => {
      await productsPage.fillProductName(productsPage.editedTitle);
      await productsPage.checkSlugChanged();
    });
    await test.step('Change description and excerpt', async () => {
      //await productsPage.fillDescription('Description text');
      await productsPage.fillExcerpt('Excerpt text');
    });
    await test.step('Remove cover and upload another', async () => {
      await productsPage.removeCover();
      await productsPage.clickUploadCover();
      await productsPage.uploadCover(
        'https://upload.wikimedia.org/wikipedia/commons/8/8f/Portland_Vase_BM_Gem4036_n5.jpg',
      );
    });
    await test.step('Add 2 gallery images', async () => {
      await productsPage.uploadGalleryImg(
        'https://upload.wikimedia.org/wikipedia/commons/b/b8/Chinese_vase.jpg',
      );
      await productsPage.uploadGalleryImg(
        'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTm6gseh0m1hV1Lt35kWxmnGV52r2f9_9OOSw&s',
      );
    });
    await test.step('Swap gallery images 1->2', async () => {
      await productsPage.dragImg(0, 1);
    });
    await test.step('Change prices, SKU, weight', async () => {
      await productsPage.fillProductPrice(productsPage.price);
      await productsPage.fillSku('SKU');
      await productsPage.switchShipping();
      await productsPage.fillWeight(1500);
    });
    await test.step('Add 1 category', async () => {
      await productsPage.clickAddCategory();
      await productsPage.selectCategory(categoriesPage.title);
      await productsPage.clickOkInModalBrowseCategories();
    });

    await test.step('Change product type', async () => {
      await productsPage.clickSelectType();
      await productsPage.fillType('Product type 1');

      // FIXME add check
    });

    await test.step('Submit, reload, open and check values', async () => {
      await productsPage.saveProduct();
      await productsPage.reloadPage();
      await productsPage.openEditProduct(productsPage.editedTitle);

      await productsPage.checkTitle();
      await productsPage.checkSlug();
      await productsPage.checkPrice();
      //await productsPage.checkDescription();
      await productsPage.checkExcerpt();
      await productsPage.checkWeight();
      await productsPage.checkCategory();
    });
  });
});
