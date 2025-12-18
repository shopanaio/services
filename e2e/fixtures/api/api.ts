import { AdminApiFixture } from '@fixtures/admin/api';
import { StorefrontApiFixture } from '@fixtures/storefront/api';
import { SessionFixture } from '@fixtures/Session';
import { test as base } from '@playwright/test';

export interface ApiFixtures {
  api: {
    client: StorefrontApiFixture;
    admin: AdminApiFixture;
    session: SessionFixture;
  };
}

export const test = base.extend<ApiFixtures>({
  api: async ({ request }, use) => {
    const session = new SessionFixture();
    const api = {
      admin: new AdminApiFixture({ request, session }),
      client: new StorefrontApiFixture({ request, session }),
      session,
    };

    session.setApi(api);
    await use(api);
  },
});
