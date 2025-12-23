import { generateUser, UserData } from '@utils/user';
import { ApiProject } from '@codegen/admin-gql';
import { StorefrontApiFixture } from '@fixtures/storefront/api';
import { AdminApiFixture } from '@fixtures/admin/api';

export class SessionFixture {
  private api!: {
    admin: AdminApiFixture;
    client: StorefrontApiFixture;
  };

  project!: Partial<ApiProject> & { id: string; slug: string; name: string };

  apiKey!: string;

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
   * Creates a new project and stores it in session
   */
  setupProject = async ({ name, slug }: { name?: string; slug?: string } = {}) => {
    this.project = await this.api.admin.project.create({ name, slug });
  };

  setApi(api: { admin: AdminApiFixture; client: StorefrontApiFixture }) {
    this.api = api;
  }
}
