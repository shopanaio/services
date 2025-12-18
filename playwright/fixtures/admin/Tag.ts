import { ApiTag, ApiTagMutationCreateArgs, ApiTagQueryFindOneArgs } from '@codegen/admin-gql';
import { TenantApiFixture } from '@fixtures/admin/api';

export class Tag {
  constructor(private api: TenantApiFixture) {}

  async create(variables: ApiTagMutationCreateArgs): Promise<ApiTag> {
    const createResponse = await this.api.mutation('admin/TagCreate', {
      variables,
    });

    return this.findOne(createResponse.data.tagMutation.create);
  }

  findOne = async (id: string): Promise<ApiTag> => {
    const { data } = await this.api.query<ApiTagQueryFindOneArgs>('admin/TagFindOne', {
      variables: { id },
    });

    return data.tagQuery.findOne as ApiTag;
  };
}
