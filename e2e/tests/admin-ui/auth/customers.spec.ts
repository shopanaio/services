import { test } from '@fixtures/base.extend';

test.describe('Customers UI', () => {
  test('Create Customers', async ({ api, storesPage, signInPage, customersPage }) => {
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

    await test.step('Create 3 customers', async () => {
      for (const customer of customersPage.customers) {
        await customersPage.clickCrateCustomer();

        await customersPage.fillCustomersName(customer.firstName);
        await customersPage.fillCustomersLastName(customer.lastName);
        await customersPage.fillCustomersEmail(customer.email);
        await customersPage.fillCustomersPhone(customer.phone);
        if (customer.language !== 'English') {
          await customersPage.fillCustomerLanguage(customer.language);
        }
        await customersPage.clickVerified();
        await customersPage.clickSaveAndExit();
      }
    });
    await test.step('Checking the correctness of the data display after saving', async () => {
      await customersPage.checkData(0, customersPage.customers[2]);
      await customersPage.checkData(1, customersPage.customers[1]);
      await customersPage.checkData(2, customersPage.customers[0]);
    });
    await test.step('Checking sorting in the customer table', async () => {
      await customersPage.clickSortByName();
      await customersPage.checkSortingByNameAscending();

      await customersPage.clickSortByName();
      await customersPage.checkSortingByNameDescending();

      await customersPage.clickSortByLastName();
      await customersPage.checkSortingByLastNameAscending();

      await customersPage.clickSortByLastName();
      await customersPage.checkSortingByLastNameDescending();

      await customersPage.clickSortByEmail();
      await customersPage.checkSortingByEmailAscending();

      await customersPage.clickSortByEmail();
      await customersPage.checkSortingByEmailDescending();

      await customersPage.clickSortByPhone();
      await customersPage.checkSortingByPhoneAscending();

      await customersPage.clickSortByPhone();
      await customersPage.checkSortingByPhoneDescending();
    });
    await test.step('Search check', async () => {
      await customersPage.fillSearch('Anna');
      await customersPage.checkExpectedResult('Anna', 'Müller');

      await customersPage.fillSearch('Dubois');
      await customersPage.checkExpectedResult('Pierre', 'Dubois');

      await customersPage.fillSearch('john.doe@example.com');
      await customersPage.checkExpectedResult('John', 'Doe');

      await customersPage.fillSearch('555987654');
      await customersPage.checkExpectedResult('Anna', 'Müller');
    });
  });
});
