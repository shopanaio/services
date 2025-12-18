import { test } from '@fixtures/base.extend';

test.describe('MenusUI', () => {
  test('Menus page', async ({
    api,
    storesPage,
    signInPage,
    pagesPage,
    productsPage,
    categoriesPage,
    menusPage,
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

    await test.step('Create product', async () => {
      await productsPage.openCreate();
      await productsPage.fillProductName(productsPage.products[0].title);

      await productsPage.syncSlug();
      await productsPage.syncSlug();

      await productsPage.fillSlug(`${productsPage.products[0].title}-slug`);

      await productsPage.saveAndExitProduct();
    });

    await test.step('Create category', async () => {
      await categoriesPage.openCategories();

      await categoriesPage.openCreate();

      await categoriesPage.fillCategoriesTitle('Clothes');

      await categoriesPage.clickSlugLockButton();
      await categoriesPage.clickSlugLockButton();

      await categoriesPage.changeSlug('clothes-slug');

      await categoriesPage.saveAndExitCategory();
    });

    await test.step('Create page', async () => {
      await pagesPage.openPages();
      await pagesPage.openCreate();

      await pagesPage.fillPagesTitle(pagesPage.title);

      await pagesPage.clickSlugLockButton();
      await pagesPage.clickSlugLockButton();

      await pagesPage.changeSlug('page-slug');

      await pagesPage.saveAndExitPages();
    });

    await test.step('Create menu', async () => {
      await menusPage.openMenus();
      await menusPage.clickCreate();

      await menusPage.fillTitle('Links');

      await menusPage.clickSlugLockButton();
      await menusPage.clickSlugLockButton();

      await menusPage.fillSlug('links-slug');

      await menusPage.clickSave();
    });

    await test.step('Add links', async () => {
      await menusPage.clickAddLink();
      await menusPage.fillLinkTitle('Product-link');
      await menusPage.clickSelectSource();
      await menusPage.selectSource('Product');
      await menusPage.clickSelectProduct();
      await menusPage.browseProduct(0);
      await menusPage.clickOkSelect();
      await menusPage.clickSaveLink();

      await menusPage.clickAddLink();
      await menusPage.fillLinkTitle('Category-link');
      await menusPage.clickSelectSource();
      await menusPage.selectSource('Category');
      await menusPage.clickSelectCategory();
      await menusPage.browseCategory(0);
      await menusPage.clickOkSelect();
      await menusPage.clickSaveLink();

      await menusPage.clickAddLink();
      await menusPage.fillLinkTitle('Page-link');
      await menusPage.clickSelectSource();
      await menusPage.selectSource('Page');
      await menusPage.clickSelectPage();
      await menusPage.browsePage(0);
      await menusPage.clickOkSelect();
      await menusPage.clickSaveLink();

      //await menusPage.clickSave();
    });

    await test.step('Check links', async () => {
      await menusPage.checkCountLinks(3);

      await menusPage.checkLinkRowTitle(1, 'Product-link');
      await menusPage.checkLinkRowTitle(2, 'Category-link');
      await menusPage.checkLinkRowTitle(3, 'Page-link');

      await menusPage.clickClose();
    });

    await test.step('Change slugs', async () => {
      await test.step('Change product slug', async () => {
        await productsPage.openProducts();
        await productsPage.openEditProduct(productsPage.products[0].title);
        await productsPage.fillSlug('product-slug-for-check');
        await productsPage.saveAndExitProduct();
      });

      await test.step('Change category slug', async () => {
        await categoriesPage.openCategories();
        await categoriesPage.openEditCategory('Clothes');
        await categoriesPage.changeSlug('category-slug-for-check');

        await categoriesPage.saveAndExitCategory();
      });

      await test.step('Change page slug', async () => {
        await pagesPage.openPages();
        await pagesPage.openEditPage(pagesPage.title);
        await pagesPage.changeSlug('page-slug-for-check');

        await pagesPage.saveAndExitPages();
      });
    });

    await test.step('Check changed slugs', async () => {
      await menusPage.openMenus();
      await menusPage.openEdit('Links');

      await test.step('Change product link-slug', async () => {
        await menusPage.clickLinkRowEdit(1);
        await menusPage.checkLinkSlug('product-slug-for-check');
        await menusPage.clickCancelLink();
      });

      await test.step('Change category link-slug', async () => {
        await menusPage.clickLinkRowEdit(2);
        await menusPage.checkLinkSlug('category-slug-for-check');
        await menusPage.clickCancelLink();
      });

      await test.step('Change page link-slug', async () => {
        await menusPage.clickLinkRowEdit(3);
        await menusPage.checkLinkSlug('page-slug-for-check');
        await menusPage.clickCancelLink();
      });
    });

    await test.step('Change link title and check', async () => {
      await test.step('Change titles', async () => {
        await test.step('Change product title', async () => {
          await menusPage.clickLinkRowEdit(1);
          await menusPage.fillLinkTitle('Product link title');
          await menusPage.clickSaveLink();
        });

        await test.step('Change category title', async () => {
          await menusPage.clickLinkRowEdit(2);
          await menusPage.fillLinkTitle('Category link title');
          await menusPage.clickSaveLink();
        });

        await test.step('Change page title', async () => {
          await menusPage.clickLinkRowEdit(3);
          await menusPage.fillLinkTitle('Page link title');
          await menusPage.clickSaveLink();
        });
      });

      await test.step('Check titles', async () => {
        await menusPage.checkLinkRowTitle(1, 'Product link title');

        await menusPage.checkLinkRowTitle(2, 'Category link title');

        await menusPage.checkLinkRowTitle(3, 'Page link title');
      });
    });
  });
});
