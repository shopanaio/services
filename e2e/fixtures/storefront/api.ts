import type { APIRequestContext } from '@playwright/test';
import type { GqlRequestSession } from '@fixtures/api/gqlRequest';
import { BaseGqlRequest } from '@fixtures/api/gqlRequest';
import type { ApiQuery, ApiMutation } from '@codegen/client-gql';

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
