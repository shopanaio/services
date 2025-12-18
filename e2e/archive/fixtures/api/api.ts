import { TenantApiFixture } from '@fixtures/admin/api';
import { ClientApiFixture } from '@fixtures/client/api';
import { SessionFixture } from '@fixtures/Session';
import { test as base } from '@playwright/test';
import { CheckoutApiFixture } from '@fixtures/checkout/api';

export interface ApiFixtures {
  api: {
    client: ClientApiFixture;
    admin: TenantApiFixture;
    session: SessionFixture;
  };
}

export const test = base.extend<ApiFixtures>({
  api: async ({ request }, use) => {
    const session = new SessionFixture();
    const api = {
      admin: new TenantApiFixture({ request, session }),
      client: new ClientApiFixture({ request, session }),
      session,
    };

    session.setApi(api);
    await use(api);
  },
});
