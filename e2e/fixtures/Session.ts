import { generateUser, UserData, Timezone } from '@utils/user';
import { ApiProject, ApiSession, ApiUserMutationSignUpArgs } from '@codegen/admin-gql';
import { LocaleCode } from '@codegen/client-gql';
import { StorefrontApiFixture } from '@fixtures/storefront/api';
import { AdminApiFixture } from '@fixtures/admin/api';

export class SessionFixture {
  private api!: {
    admin: AdminApiFixture;
    client: StorefrontApiFixture;
  };

  scope: 'tenant' | 'customer' = 'tenant';

  tenant: {
    data: UserData;
    accessToken?: string;
  };

  customer: {
    data: UserData;
    accessToken?: string;
  };

  project = {} as ApiProject;

  apiKey!: string;

  get projectSlug(): string {
    return this.project.slug;
  }

  get user() {
    if (this.scope === 'tenant') {
      return this.tenant;
    }

    if (this.scope === 'customer') {
      return this.customer;
    }

    throw new Error('Unexpected scope');
  }

  get accessToken(): string | null {
    return this.user.accessToken ?? null;
  }

  constructor() {
    this.tenant = { data: generateUser() };
    this.customer = { data: generateUser() };
  }

  async setupUser() {
    const { data } = await this.api.admin.mutation<ApiUserMutationSignUpArgs>('users-api/SignUp', {
      variables: {
        input: {
          email: this.tenant.data.email,
          password: this.tenant.data.password,
        },
      },
    });

    const result = data.userMutation.signUp;
    this.tenant.accessToken = result.token?.accessToken;
    return result;
  }

  setApi(api: { admin: AdminApiFixture; client: StorefrontApiFixture }) {
    this.api = api;
  }

  setTenantScope() {
    this.scope = 'tenant';
  }

  setCustomerScope() {
    this.scope = 'customer';
  }
}
