import { generateUser, UserData } from '@utils/user';
import { ApiStore } from '@codegen/admin-gql';
import { StorefrontApiFixture } from '@fixtures/storefront/api';
import { AdminApiFixture } from '@fixtures/admin/api';

export class SessionFixture {
  private api!: {
    admin: AdminApiFixture;
    client: StorefrontApiFixture;
  };

  project!: Partial<ApiStore> & { id: string; slug: string; name: string };

  organizationId?: string;

  apiKey!: string;

  scope: 'tenant' | 'customer' = 'tenant';

  tenant: {
    data: UserData;
    accessToken?: string;
    userId?: string;
  };

  get projectSlug(): string {
    return this.project?.slug ?? '';
  }

  get user() {
    return this.tenant;
  }

  get accessToken(): string | null {
    return this.user.accessToken ?? null;
  }

  constructor() {
    this.tenant = { data: generateUser() };
  }

  /**
   * Creates and authenticates a new user, storing credentials in session
   */
  async setupUser() {
    const session = await this.api.admin.user.create({
      email: this.tenant.data.email,
      password: this.tenant.data.password,
    });

    this.tenant.accessToken = session.accessToken;
    this.tenant.userId = session.userId;

    return {
      user: { id: session.userId },
      token: { accessToken: session.accessToken },
    };
  }

  /**
   * Creates an organization and stores the ID in session
   */
  async setupOrganization({ name, slug }: { name?: string; slug?: string } = {}) {
    const orgSlug = slug ?? `test-org-${crypto.randomUUID().slice(0, 8)}`;
    const { data } = await this.api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: name ?? 'Test Organization',
          slug: orgSlug,
        },
      },
    });

    const organization = data.organizationMutation.organizationCreate.organization;
    if (!organization) {
      throw new Error('Failed to create organization');
    }

    this.organizationId = organization.id;
    return organization;
  }

  /**
   * Creates a new store and stores it in session.
   * Requires organization to be set up first (via setupOrganization).
   */
  setupProject = async ({ name, slug }: { name?: string; slug?: string } = {}) => {
    if (!this.organizationId) {
      await this.setupOrganization();
    }
    this.project = await this.api.admin.project.create({
      organizationId: this.organizationId!,
      name,
      slug,
    });
  };

  setApi(api: { admin: AdminApiFixture; client: StorefrontApiFixture }) {
    this.api = api;
  }

  /**
   * Clears the session to simulate an unauthenticated user
   */
  clearSession() {
    this.tenant.accessToken = undefined;
    this.tenant.userId = undefined;
  }
}
