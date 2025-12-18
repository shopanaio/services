import { test } from '@fixtures/base.extend';

test.describe('Menus UI', () => {
  test('Menus filter', async ({
    api,
    storesPage,
    signInPage,
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

    await test.step('Create 3 menus', async () => {
      await menusPage.openMenus();

      for (const menu of menusPage.menus) {
        await menusPage.clickCreate();

        await menusPage.fillTitle(menu);
        await menusPage.clickSlugLockButton();
        await menusPage.clickSlugLockButton();
        await menusPage.fillSlug(`${menu}-slug`);

        await menusPage.saveAndExit();
      };
    });

    await test.step('Check created menus', async () => {
      await menusPage.checkMenuRowTitle(1, 'HEX');
      await menusPage.checkMenuRowTitle(2, 'RGB');
      await menusPage.checkMenuRowTitle(3, 'CMYK');
    })


    await test.step('Sort menus and check', async () => {
      await menusPage.clickSortByTitle();

      await test.step('Check alphabetical order', async () => {
        await menusPage.checkMenuRowTitle(1, 'CMYK');
        await menusPage.checkMenuRowTitle(2, 'HEX');
        await menusPage.checkMenuRowTitle(3, 'RGB')
      })

      await menusPage.clickSortByTitle();

      await test.step('Check alphabetical reverse order', async () => {
        await menusPage.checkMenuRowTitle(1, 'RGB');
        await menusPage.checkMenuRowTitle(2, 'HEX');
        await menusPage.checkMenuRowTitle(3, 'CMYK')
      })
    })

    await test.step('Filter menus', async () => {
      await menusPage.fillFilter('R');

      await test.step('Check remain elements', async () => {
        await menusPage.checkMenuRowTitle(1, 'RGB');
      })

      await menusPage.fillFilter('H');

      await test.step('Check remain elements', async () => {
        await menusPage.checkMenuRowTitle(1, 'HEX');
      })
    })
  });
});
