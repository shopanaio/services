import { BaseGqlRequest, GqlRequestSession } from '@fixtures/api/gqlRequest';
import { ApiMutation, ApiQuery } from '@codegen/admin-gql';
import { APIRequestContext } from '@playwright/test';

class AdminGqlRequest extends BaseGqlRequest<ApiQuery, ApiMutation> {
  constructor(request: APIRequestContext, session: GqlRequestSession) {
    const graphqlUrl = process.env.ADMIN_GRAPHQL_URL;
    if (!graphqlUrl) {
      throw new Error('CLIENT_GRAPHQL_URL environment variable is not set');
    }
    super(request, graphqlUrl, session);
  }
}

export class AdminApiFixture extends AdminGqlRequest {
  constructor({ request, session }: { session: GqlRequestSession; request: APIRequestContext }) {
    super(request, session);
  }
}
