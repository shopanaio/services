import { ApiApiKey, ApiCreateApiKeyInput } from '@codegen/admin-gql';
import { TenantApiFixture } from '@fixtures/admin/api';

export class ApiKey {
  constructor(private api: TenantApiFixture) {}

  async create(input: ApiCreateApiKeyInput): Promise<string> {
    const { data } = await this.api.mutation('admin/ProjectCreateApiKey', {
      variables: { input },
    });

    return data.projectMutation.createApiKey;
  }

  async delete(id: string): Promise<boolean> {
    const { data } = await this.api.mutation('admin/ProjectDeleteApiKey', {
      variables: { id },
    });
    return data.projectMutation.deleteApiKey;
  }

  async findMany(): Promise<ApiApiKey[]> {
    const { data } = await this.api.query('admin/ProjectApiKeys', {});
    return data.projectQuery.apiKeys as ApiApiKey[];
  }
}
