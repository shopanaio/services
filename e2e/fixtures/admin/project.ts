import { ApiStoreCreateInput, CurrencyCode, LocaleCode } from '@codegen/admin-gql';
import { BaseGqlRequest } from '@fixtures/api/gqlRequest';
import _ from 'lodash';

export class ProjectFixture {
  constructor(private gql: BaseGqlRequest<unknown, unknown>) {}

  create = async (input: Partial<ApiStoreCreateInput> & { organizationId: string }) => {
    const defaults: Omit<ApiStoreCreateInput, 'organizationId'> = {
      name: `test-project-${crypto.randomUUID().slice(0, 8)}`,
      displayName: 'Playwright Project',
      locales: [LocaleCode.En],
      currencies: [CurrencyCode.Usd],
      defaultCurrency: CurrencyCode.Usd,
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
