import type { ApiTag, ApiTagCreateInput } from '@codegen/admin-gql';
import type { BaseGqlRequest } from '@fixtures/api/gqlRequest';

type UserError = { code: string; message: string; field?: string[] | null };

export class TagFixture {
  private gql: BaseGqlRequest<unknown, unknown>;

  constructor(gql: BaseGqlRequest<unknown, unknown>) {
    this.gql = gql;
  }

  create = async (input: Partial<ApiTagCreateInput> = {}): Promise<ApiTag> => {
    const handle = input.handle ?? `test-tag-${crypto.randomUUID().slice(0, 8)}`;

    const { data } = await this.gql.mutation('inventory-api/TagCreate', {
      variables: {
        input: {
          handle,
          name: input.name ?? handle,
        },
      },
    });

    const result = (
      data as {
        catalogMutation: {
          tagCreate: {
            tag: ApiTag | null;
            userErrors: UserError[];
          };
        };
      }
    ).catalogMutation.tagCreate;

    if (result.userErrors.length > 0 || !result.tag) {
      throw new Error(`Failed to create tag: ${JSON.stringify(result.userErrors)}`);
    }

    return result.tag;
  };
}
