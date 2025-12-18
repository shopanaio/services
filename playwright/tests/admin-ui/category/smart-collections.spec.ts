import { test } from '@fixtures/base.extend';

test.describe('Smart-collection UI', () => {
  test('Smart-collection', async ({
    api,
    storesPage,
    signInPage,
    productsPage,
    tagsPage,
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

    await test.step('Create 5 products with different prices, stock status', async () => {
      for (let i = 0; i < productsPage.products.length; i++) {
        await productsPage.openCreate();
        await productsPage.fillProductName(productsPage.products[i].title);
        await productsPage.fillProductPrice(productsPage.products[i].price);
        await productsPage.changeStatus(productsPage.products[i].stockStatus);
        if (i === 4) {
          await productsPage.clickAddOptions();
          await productsPage.fillFeaturesTitle('Size', false);
          const sizes = productsPage.products[i].sizes;
          if (sizes?.length) {
            await productsPage.addFeature(sizes[0]);
          }
          await productsPage.clickDoneOptions();

          await productsPage.clickAddOptions();
          await productsPage.fillFeaturesTitle('Material', false);
          const material = productsPage.products[i].material;
          if (material?.length) {
            await productsPage.addFeature(material[0]);
          }
          await productsPage.clickDoneOptions();

          await productsPage.clickAddOptions();
          await productsPage.fillFeaturesTitle('Color', false);
          const color = productsPage.products[i].color;
          if (color?.length) {
            await productsPage.addFeature(color[0]);
            await productsPage.addFeature(color[1]);
            await productsPage.addFeature(color[2]);
          }
          await productsPage.clickDoneOptions();

          await productsPage.variantsSetPriceAvailable();

          await productsPage.expandRows('Oversize', 3);
          await productsPage.variantsSettings(2);

          for (let i = 0; i < 3; i++) {
            await productsPage.openVariantForm(i);
            await productsPage.retitleVariant();
            await productsPage.saveVariantForm();
          }
        }

        await productsPage.saveAndExitProduct();
      }
    });

    await test.step('Create tag and add in one product', async () => {
      await tagsPage.openSettings();
      await tagsPage.openTagsInSettings();

      await tagsPage.clickCreateTag();
      await tagsPage.fillTagName('tag_1');
      await tagsPage.clickSaveTag();

      await productsPage.openProducts();
      await productsPage.openEditProduct('Hoodie');

      await productsPage.clickSelectTag();
      await productsPage.selectTag('tag_1');

      await productsPage.clickOkInModalBrowseTags();

      await productsPage.saveAndExitProduct();
    });

    await test.step('Create category with 4 of 5 products', async () => {
      await categoriesPage.openCategories();

      await categoriesPage.openCreate();
      await categoriesPage.fillCategoriesTitle('Clothes');

      await categoriesPage.clickAddProduct();
      await categoriesPage.manageContentAddProd(3);
      await categoriesPage.clickOkInModalBrowseProducts();

      await categoriesPage.saveAndExitCategory();
    });

    /* ------ smart collection ------ */

    await test.step('Create smart collection', async () => {
      await categoriesPage.openCreate();
      await categoriesPage.fillCategoriesTitle('Smart collection');
      await categoriesPage.clickSaveCategories();

      await categoriesPage.clickSmartCollection();
    });

    await test.step('Create availability filter - in stock', async () => {
      await categoriesPage.selectFilterAvailability(0, 'in-stock');

      await categoriesPage.checkContentDrawer(5);
      await categoriesPage.clickSaveCategories();
      await categoriesPage.timeout(1000);
      await categoriesPage.checkFilteredProducts([
        'Pants',
        'Hoodie oversize ▸ cotton ▸ red',
        'Hoodie oversize ▸ cotton ▸ green',
        'Sunglasses',
        'Hat',
      ]);
    });

    await test.step('Create price filter', async () => {
      await categoriesPage.clickAddFilter();
      await categoriesPage.selectFilterPrice(1, 40);
      await categoriesPage.checkContentDrawer(4);
      await categoriesPage.clickSaveCategories();
      await categoriesPage.timeout(1000);
      await categoriesPage.checkFilteredProducts([
        'Pants',
        'Hoodie oversize ▸ cotton ▸ red',
        'Hoodie oversize ▸ cotton ▸ green',
        'Sunglasses',
      ]);
    });

    await test.step('Create category filter - standard', async () => {
      await categoriesPage.clickAddFilter();
      await categoriesPage.selectFilterCategory(2);
      await categoriesPage.clickOkInModalBrowseCategories();
      await categoriesPage.checkContentDrawer(3);
      await categoriesPage.clickSaveCategories();
      await categoriesPage.timeout(2000);
      await categoriesPage.checkFilteredProducts([
        'Pants',
        'Hoodie oversize ▸ cotton ▸ red',
        'Hoodie oversize ▸ cotton ▸ green',
      ]);
    });

    await test.step('Create tag filter', async () => {
      await categoriesPage.clickAddFilter();
      await categoriesPage.selectFilterTag(3);
      await categoriesPage.clickOkInModalBrowseTags();
      await categoriesPage.checkContentDrawer(2);
      await categoriesPage.clickSaveCategories();
      await categoriesPage.timeout(1000);
      await categoriesPage.checkFilteredProducts([
        'Hoodie oversize ▸ cotton ▸ red',
        'Hoodie oversize ▸ cotton ▸ green',
      ]);
    });

    await test.step('Create features filter - add all 3', async () => {
      await categoriesPage.clickAddFilter();
      await categoriesPage.selectFilterFeatures(4);
      await categoriesPage.clickOkInModalBrowseFeatures();
      await categoriesPage.clickSaveCategories();
      await categoriesPage.checkContentDrawer(2);
      await categoriesPage.timeout(1000);
      await categoriesPage.checkFilteredProducts([
        'Hoodie oversize ▸ cotton ▸ red',
        'Hoodie oversize ▸ cotton ▸ green',
      ]);
    });

    await test.step('Change features filter', async () => {
      await categoriesPage.deleteSelectedFilterItem('Size: oversize');
      await categoriesPage.deleteSelectedFilterItem('Material: cotton');
    });

    await test.step('Save and check', async () => {
      await categoriesPage.clickSaveCategories();
      await categoriesPage.checkContentDrawer(1);
      await categoriesPage.timeout(1000);
      await categoriesPage.checkFilteredProducts(['Hoodie oversize ▸ cotton ▸ red']);
    });
  });
});
