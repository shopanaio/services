import type { ApiStoreCreateInput } from '@codegen/admin-gql';

import type { BaseGqlRequest } from '@fixtures/api/gqlRequest';
import _ from 'lodash';

export class ProjectFixture {
  private gql: BaseGqlRequest<unknown, unknown>;

  constructor(gql: BaseGqlRequest<unknown, unknown>) {
    this.gql = gql;
  }

  create = async (input: Partial<ApiStoreCreateInput> & { organizationId: string }) => {
    const defaults: Omit<ApiStoreCreateInput, 'organizationId'> = {
      name: `test-project-${crypto.randomUUID().slice(0, 8)}`,
      displayName: 'Playwright Project',
      locales: ['en'],
      currencies: ['USD'],
      defaultCurrency: 'USD',
    };

    const { data } = await this.gql.mutation('project-api/ProjectCreate', {
      variables: {
        input: _.merge(defaults, input),
      },
    });

    const result = (
      data as {
        storeMutation: {
          storeCreate: {
            store: { id: string; name: string; displayName: string } | null;
            userErrors: { code: string; message: string; field: string }[];
          };
        };
      }
    ).storeMutation.storeCreate;

    if (result.userErrors.length > 0 || !result.store) {
      throw new Error('Failed to create store: ' + JSON.stringify(result.userErrors));
    }

    return result.store;
  };
}
