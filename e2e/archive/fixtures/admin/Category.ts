import type { ApiCategory, ApiCategoryMutationCreateArgs, ApiCategoryMutationUpdateArgs, ApiCategoryQueryFindOneArgs } from '@codegen/admin-gql';
import type { TenantApiFixture } from '@fixtures/admin/api';

export class Category {
  constructor(private api: TenantApiFixture) {}

  async create(variables: ApiCategoryMutationCreateArgs): Promise<ApiCategory> {
    const { data } = await this.api.mutation('admin/CategoryCreate', {
      variables,
    });

    return this.findOne(data.categoryMutation.create);
  }

  async update(variables: ApiCategoryMutationUpdateArgs): Promise<boolean> {
    const { data } = await this.api.mutation('admin/CategoryUpdate', {
      variables,
    });

    return data.categoryMutation.update;
  }

  findOne = async (id: string): Promise<ApiCategory> => {
    const { data } = await this.api.query<ApiCategoryQueryFindOneArgs>('admin/CategoryFindOne', {
      variables: { id },
    });

    return data.categoryQuery.findOne as ApiCategory;
  };
}
