 
import { StoresPage } from '@fixtures/pages/StoresPage';
import { AccountPage } from '@fixtures/pages/AccountPage';
import { SignUpPage } from '@fixtures/pages/SignUpPage';
import { FeaturesPage } from './pages/FeaturesPage';
import { SignInPage } from '@fixtures/pages/SignInPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { ProductsPage } from './pages/ProductsPage';
import { CustomersPage } from './pages/CustomersPage';
import { TagsPage } from './pages/TagsPage';
import { TranslationsPage } from './pages/TranslationsPage';
import { FilesPage } from './pages/FilesPage';
import { PagesPage } from './pages/PagesPage';
import { OrdersPage } from './pages/OrdersPage';
import { MenusPage } from './pages/MenusPage';
import { SettingsPage } from './pages/SettingsPage';
import { FulfillmentPage } from './pages/FulfillmentPage';
import { ApiFixtures, test as base } from '@fixtures/api/api';

interface Fixtures extends ApiFixtures {
  accountPage: AccountPage;
  categoriesPage: CategoriesPage;
  customersPage: CustomersPage;
  featuresPage: FeaturesPage;
  filesPage: FilesPage;
  fulfillmentPage: FulfillmentPage;
  menusPage: MenusPage;
  ordersPage: OrdersPage;
  pagesPage: PagesPage;
  productsPage: ProductsPage;
  settingsPage: SettingsPage;
  signInPage: SignInPage;
  signUpPage: SignUpPage;
  storesPage: StoresPage;
  tagsPage: TagsPage;
  translationsPage: TranslationsPage;
}

export const test = base.extend<Fixtures>({
  signInPage: async ({ page }, use) => {
    const signInPage = new SignInPage(page);
    await use(signInPage);
  },

  signUpPage: async ({ page }, use) => {
    const signUpPage = new SignUpPage(page);
    await use(signUpPage);
  },

  storesPage: async ({ page }, use) => {
    const storesPage = new StoresPage(page);
    await use(storesPage);
  },

  accountPage: async ({ page }, use) => {
    const accountPage = new AccountPage(page);
    await use(accountPage);
  },

  featuresPage: async ({ page }, use) => {
    const featuresPage = new FeaturesPage(page);
    await use(featuresPage);
  },

  categoriesPage: async ({ page }, use) => {
    const categoriesPage = new CategoriesPage(page);
    await use(categoriesPage);
  },

  productsPage: async ({ page }, use) => {
    const productsPage = new ProductsPage(page);
    await use(productsPage);
  },

  customersPage: async ({ page }, use) => {
    const customersPage = new CustomersPage(page);
    await use(customersPage);
  },

  tagsPage: async ({ page }, use) => {
    const tagsPage = new TagsPage(page);
    await use(tagsPage);
  },

  translationsPage: async ({ page }, use) => {
    const translationsPage = new TranslationsPage(page);
    await use(translationsPage);
  },

  filesPage: async ({ page }, use) => {
    const filesPage = new FilesPage(page);
    await use(filesPage);
  },

  pagesPage: async ({ page }, use) => {
    const pagesPage = new PagesPage(page);
    await use(pagesPage);
  },

  ordersPage: async ({ page }, use) => {
    const ordersPage = new OrdersPage(page);
    await use(ordersPage);
  },

  menusPage: async ({ page }, use) => {
    const menusPage = new MenusPage(page);
    await use(menusPage);
  },

  settingsPage: async ({ page }, use) => {
    const settingsPage = new SettingsPage(page);
    await use(settingsPage);
  },

  fulfillmentPage: async ({ page }, use) => {
    const fulfillmentPage = new FulfillmentPage(page);
    await use(fulfillmentPage);
  },
});
