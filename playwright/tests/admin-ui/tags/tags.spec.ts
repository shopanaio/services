import { test } from '@fixtures/base.extend';

test.describe('Tags UI', () => {
  test('Create Tags', async ({ api, storesPage, signInPage, tagsPage, productsPage }) => {
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

    await test.step('Open tags', async () => {
      await tagsPage.openSettings();
      await tagsPage.openTagsInSettings();
    })

    await test.step('Create 3 tags', async () => {
      await tagsPage.clickCreateTag();
      await tagsPage.fillTagName('tag_1');
      await tagsPage.clickSaveTag();

      await tagsPage.clickCreateTag();
      await tagsPage.fillTagName('tag_2');
      await tagsPage.clickSaveTag();

      await tagsPage.clickCreateTag();
      await tagsPage.fillTagName('tag_3');
      await tagsPage.clickSaveTag();
    });

    await test.step('Check tags', async () => {
      await tagsPage.checkTag(0, 'tag_1');
      await tagsPage.checkTag(1, 'tag_2');
      await tagsPage.checkTag(2, 'tag_3');
    });

    await test.step('Add tag to product', async () => {
      await productsPage.openProducts();
      await productsPage.openCreate();
      await productsPage.fillProductName('Product 1');
      await productsPage.saveProduct();

      await productsPage.clickSelectTag();
      await productsPage.selectTag('tag_1');
      await productsPage.selectTag('tag_2');
      await productsPage.selectTag('tag_3');

      await productsPage.clickOkInModalBrowseTags();
    });

    await test.step('Check tags in product', async () => {
      await productsPage.checkTagInProduct('tag_1');
      await productsPage.checkTagInProduct('tag_2');
      await productsPage.checkTagInProduct('tag_3');
    });

    await test.step('Delete tag from product', async () => {
      await productsPage.deleteTagFromProduct('tag_1');
    });

    await test.step('Check tag deleted from product', async () => {
      await productsPage.checkTagIsAbsent('tag_1');
    });

    await test.step('Save and check if the tags remain in the product', async () => {
      await productsPage.saveAndExitProduct();
      await productsPage.openEditProduct('Product 1');

      await productsPage.checkTagInProduct('tag_2');
      await productsPage.checkTagInProduct('tag_3');
    });
  });
});
