import { ApiPage, ApiPageMutationCreateArgs, ApiPageQueryFindOneArgs } from '@codegen/admin-gql';
import { TenantApiFixture } from '@fixtures/admin/api';

export class Page {
  constructor(private api: TenantApiFixture) {}

  async create(variables: ApiPageMutationCreateArgs): Promise<ApiPage> {
    const createResponse = await this.api.mutation('admin/PageCreate', {
      variables,
    });

    return this.findOne(createResponse.data.pageMutation.create);
  }

  findOne = async (id: string): Promise<ApiPage> => {
    const { data } = await this.api.query<ApiPageQueryFindOneArgs>('admin/PageFindOne', {
      variables: { id },
    });

    return data.pageQuery.findOne as ApiPage;
  };
}
