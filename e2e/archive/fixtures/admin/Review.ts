import type { ApiReview, ApiReviewMutationCreateArgs, ApiReviewMutationEditArgs, ApiReviewQueryFindOneArgs } from '@codegen/admin-gql';
import type { TenantApiFixture } from '@fixtures/admin/api';

export class Review {
  constructor(private api: TenantApiFixture) {}

  async create(input: ApiReviewMutationCreateArgs['input']): Promise<string> {
    const { data } = await this.api.mutation('admin/ReviewCreate', { variables: { input } });

    return data.reviewMutation.create as string;
  }

  async update(variables: ApiReviewMutationEditArgs): Promise<boolean> {
    const { data } = await this.api.mutation('admin/ReviewUpdate', {
      variables,
    });

    return data.reviewMutation.edit;
  }

  findOne = async (id: string): Promise<ApiReview> => {
    const { data } = await this.api.query<ApiReviewQueryFindOneArgs>('admin/ReviewFindOne', {
      variables: { id },
    });
    return data.reviewQuery.findOne as ApiReview;
  };

  async approve(id: string): Promise<boolean> {
    const { data } = await this.api.mutation('admin/ReviewApprove', {
      variables: { input: { id } },
    });
    return data.reviewMutation.approve;
  }

  async reject(id: string, reason: string): Promise<boolean> {
    const { data } = await this.api.mutation('admin/ReviewReject', {
      variables: { input: { id, reason } },
    });
    return data.reviewMutation.reject;
  }

  async bulkUpdateStatus(ids: string[], status: string): Promise<boolean> {
    const { data } = await this.api.mutation('admin/ReviewBulkUpdateStatus', {
      variables: { input: { ids, status } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.reviewMutation as any).bulkUpdateStatus as boolean;
  }

  async delete(id: string): Promise<boolean> {
    const { data } = await this.api.mutation('admin/ReviewDelete', {
      variables: { input: id },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.reviewMutation as any).delete as boolean;
  }
}
