import { test } from '@fixtures/base.extend';

test('AccountPage', async ({ accountPage, api, signInPage, storesPage }) => {
  //const newPassword = '12345678';

  await test.step('Create user', async () => {
    await api.session.setupUser();
  })

  await test.step('SignIn', async () => {
    await test.step('GoTo', async () => {
      await signInPage.goto();
    })

    await test.step('Fill necessary fields', async () => {
      await signInPage.fillEmail(api.session.user.data.email);
      await signInPage.fillPassword(api.session.user.data.password);
    })

    await test.step('Submit', async () => {
      await signInPage.clickSubmit();
    })
  })

  await test.step('Checking that logged in', async () => {
    await storesPage.waitFor();
  })

  await test.step('Open account', async () => {
    await accountPage.goto();
  })

  await test.step('Change info', async () => {
    await accountPage.changeFirstName(accountPage.newName);
    await accountPage.saveAccountChanges();
    await accountPage.changeLastName(accountPage.newLastName);
    await accountPage.saveAccountChanges();
    await accountPage.changeLocalization('Akan');
    // await accountPage.changePassword(newPassword);
    await accountPage.saveAccountChanges();
  })

  /* if (1) {
    // UI is not ready for next steps
    return;
  } */

  await test.step('Logout', async () => {
    await accountPage.logOut();
  })

  await test.step('SignIn again', async () => {
    await test.step('GoTo', async () => {
      await signInPage.goto();
    })

    await test.step('Fill necessary fields', async () => {
      await signInPage.fillEmail(api.session.user.data.email);
      await signInPage.fillPassword(api.session.user.data.password); // newPassword
    })

    await test.step('Submit', async () => {
      await signInPage.clickSubmit();
    })
  })

  await test.step('Open account', async () => {
    await accountPage.goto();
  })

  await test.step('Check changes', async () => {
    await accountPage.checkChanges();
  })

  await test.step('Delete account', async () => {
    await accountPage.deleteAccount();
  })

  await test.step('Try signIn and check alert', async () => {
    await test.step('GoTo', async () => {
      await signInPage.goto();
    })

    await test.step('Fill necessary fields', async () => {
      await signInPage.fillEmail(api.session.user.data.email);
      await signInPage.fillPassword(api.session.user.data.password); // newPassword
    })

    await test.step('Submit', async () => {
      await signInPage.clickSubmit();
    })

    await test.step('Check alert', async () => {
      await accountPage.checkAlert();
    })
  })
});
