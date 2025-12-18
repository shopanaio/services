import { APIRequestContext } from '@playwright/test';
import { BaseGqlRequest, GqlRequestSession } from '@fixtures/api/gqlRequest';
import { ApiMutation, ApiQuery } from '@codegen/client-gql';

class CheckoutGqlRequest extends BaseGqlRequest<ApiQuery, ApiMutation> {
  constructor(request: APIRequestContext, session: GqlRequestSession) {
    const graphqlUrl = process.env.CHECKOUT_GRAPHQL_URL;
    if (!graphqlUrl) {
      throw new Error('CHECKOUT_GRAPHQL_URL environment variable is not set');
    }
    super(request, graphqlUrl, session);
  }
}

export class CheckoutApiFixture extends CheckoutGqlRequest {}
