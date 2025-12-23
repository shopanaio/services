import { ApiProjectCreateInput, CurrencyCode, LocaleCode } from '@codegen/admin-gql';
import { BaseGqlRequest } from '@fixtures/api/gqlRequest';
import _ from 'lodash';

export class ProjectFixture {
  constructor(private gql: BaseGqlRequest<unknown, unknown>) {}

  create = async (input: Partial<ApiProjectCreateInput> = {}) => {
    const defaults: ApiProjectCreateInput = {
      slug: `test-project-${crypto.randomUUID().slice(0, 8)}`,
      name: 'Playwright Project',
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
        projectMutation: {
          projectCreate: {
            project: { id: string; slug: string; name: string } | null;
            userErrors: { code: string; message: string; field: string }[];
          };
        };
      }
    ).projectMutation.projectCreate;

    if (result.userErrors.length > 0 || !result.project) {
      throw new Error('Failed to create project: ' + JSON.stringify(result.userErrors));
    }

    return result.project;
  };
}
