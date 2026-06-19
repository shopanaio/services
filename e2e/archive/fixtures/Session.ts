import type { UserData } from '@utils/user';
import { Country, Currency, generateUser, Locale, Timezone } from '@utils/user';
import type { ApiProject, ApiSession, ApiUserMutationSignInArgs, ApiUserMutationSignUpArgs } from '@codegen/admin-gql';

import type { ClientApiFixture } from '@fixtures/client/api';
import type { TenantApiFixture } from '@fixtures/admin/api';

export class SessionFixture {
  private api!: {
    admin: TenantApiFixture;
    client: ClientApiFixture;
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

  async setupUser(): Promise<ApiSession> {
    const { data } = await this.api.admin.mutation<ApiUserMutationSignUpArgs>('admin/UserSignUp', {
      variables: {
        input: {
          email: this.tenant.data.email,
          password: this.tenant.data.password,
          firstName: this.tenant.data.firstName,
          lastName: this.tenant.data.lastName,
          language: 'en',
          timezone: Timezone.EUROPE_KIEV,
        },
      },
    });

    this.tenant.accessToken = data.userMutation.signUp.jwt;
    return data.userMutation.signUp;
  }

  async signIn(email: string, password: string) {
    const { data } = await this.api.admin.mutation<ApiUserMutationSignInArgs>('admin/UserSignIn', {
      variables: {
        input: {
          email,
          password,
        },
      },
    });
    const { user, jwt } = data.userMutation.signIn;

    this.tenant.accessToken = jwt;
    this.tenant.data = {
      email,
      password,
      firstName: user.firstName,
      lastName: user.lastName,
      uuid: user.id,
    };

    return data.userMutation.signIn;
  }

  async setupProject(): Promise<ApiProject> {
    const { data } = await this.api.admin.mutation('admin/ProjectCreate', {
      variables: {
        input: {
          name: 'Session Store',
          currency: Currency.EUR,
          country: Country.UA,
          status: 'ACTIVE',
          timezone: Timezone.EUROPE_KIEV,
          locales: [Locale.EN, Locale.RU],
        },
      },
    });

    this.project = data.projectMutation.create;
    return data.projectMutation.create;
  }

  async pullProject(slug: string) {
    this.project = await this.api.admin.projects.get(slug);
    return this.project;
  }

  async setupApiKey() {
    this.apiKey = await this.api.admin.apiKey.create({
      name: 'Test API Key',
    });
    this.setCustomerScope();
  }

  setupUserAndProject = async () => {
    await this.setupUser();
    await this.setupProject();
  };

  setupCustomer = async () => {
    this.setCustomerScope();
    const { data } = await this.api.client.auth.passwordSignUp({
      email: this.customer.data.email,
      password: this.customer.data.password,
    });
    if (!data?.passwordSignUp?.session?.accessToken) {
      throw new Error('Failed to sign up customer');
    }
    this.customer.data.uuid = data?.passwordSignUp?.session?.user?.iid;
    this.customer.accessToken = data?.passwordSignUp?.session?.accessToken ?? null;
  };

  setupClient = async () => {
    await this.setupUser();
    await this.setupProject();
    await this.setupApiKey();

    await Promise.all(
      ['shopana', 'bank_transfer', 'novaposhta', 'meest', 'simple-promo'].map((code) =>
        this.api.admin.mutation('admin/AppsInstall', { variables: { code } }),
      ),
    );
  };

  setupClientAndCustomer = async () => {
    await this.setupClient();
    await this.setupCustomer();
  };

  setApi(api: { admin: TenantApiFixture; client: ClientApiFixture }) {
    this.api = api;
  }

  setTenantScope() {
    this.scope = 'tenant';
  }

  setCustomerScope() {
    this.scope = 'customer';
  }
}
