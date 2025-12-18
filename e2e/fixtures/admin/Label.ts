import { ApiLabel, ApiLabelMutationCreateArgs, ApiLabelQueryFindOneArgs } from '@codegen/admin-gql';
import { TenantApiFixture } from '@fixtures/admin/api';

export class Label {
  constructor(private api: TenantApiFixture) {}

  async create(variables: ApiLabelMutationCreateArgs): Promise<ApiLabel> {
    const createResponse = await this.api.mutation('admin/LabelCreate', {
      variables,
    });

    return this.findOne(createResponse.data.labelMutation.create);
  }

  findOne = async (id: string): Promise<ApiLabel> => {
    const { data } = await this.api.query<ApiLabelQueryFindOneArgs>('admin/LabelFindOne', {
      variables: { id },
    });

    return data.labelQuery.findOne as ApiLabel;
  };
}
