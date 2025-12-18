import { APIRequestContext } from '@playwright/test';
import { BaseGqlRequest, GqlRequestSession } from '@fixtures/api/gqlRequest';
import { ApiQuery, ApiMutation } from '@codegen/client-gql';

class ClientGqlRequest extends BaseGqlRequest<ApiQuery, ApiMutation> {
  constructor(request: APIRequestContext, session: GqlRequestSession) {
    const graphqlUrl = process.env.CLIENT_GRAPHQL_URL;
    if (!graphqlUrl) {
      throw new Error('CLIENT_GRAPHQL_URL environment variable is not set');
    }
    super(request, graphqlUrl, session);
  }
}

export class StorefrontApiFixture extends ClientGqlRequest {
  constructor({ request, session }: { request: APIRequestContext; session: GqlRequestSession }) {
    super(request, session);
  }
}
