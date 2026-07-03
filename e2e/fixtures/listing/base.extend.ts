import { test as base } from '@fixtures/base.extend';
import type { ListingCatalogFixture } from './seed';
import { seedCategoryListingProducts } from './seed';

interface ListingFixtures {
  listingCatalog: ListingCatalogFixture;
}

export const test = base.extend<ListingFixtures>({
  listingCatalog: async ({ api }, use) => {
    await api.session.setupUserAndStore({
      defaultCurrency: 'USD',
      locales: ['en'],
      currencies: ['USD'],
    });

    await use(await seedCategoryListingProducts(api, 30));
  },
});
