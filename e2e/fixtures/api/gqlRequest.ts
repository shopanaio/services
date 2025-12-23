import { APIRequestContext } from '@playwright/test';
import { readQuery } from './types';
import { GraphQLError } from 'graphql';
import { GraphQLFileName } from '@queries/filenames';

export interface GqlRequestSession {
  projectSlug: string;
  apiKey: string;
  accessToken: string | null;
  scope: 'tenant' | 'customer';
}

export class BaseGqlRequest<QueryType, MutationType> {
  constructor(
    private request: APIRequestContext,
    private graphqlUrl: string,
    private session: GqlRequestSession,
  ) {}

  private async makeRequest<R, A>(
    query: string,
    props: {
      variables?: A;
      throwOnError?: boolean;
    },
  ): Promise<{ data: R; errors: GraphQLError[] }> {
    const { projectSlug: slug, apiKey, accessToken, scope } = this.session;

    if (!this.graphqlUrl) {
      throw new Error('GraphQL URL is not provided');
    }

    const q = readQuery(query);
    const response = await this.request.post(this.graphqlUrl, {
      headers: {
        'Content-Type': 'application/json',
        // Scope
        ...(scope === 'customer'
          ? {
              ...(apiKey ? { 'X-Api-Key': apiKey } : {}),
            }
          : {
              ...(slug ? { 'X-Project-Name': slug } : {}),
            }),
        // Tenant or Customer Access Token
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      data: {
        query:q,
        variables: props.variables,
      },
    });

    const json = await response.json();
    if (json.errors || json.data === null) {
      // console.log(JSON.stringify(json, null, 2), "API Response");
    }
    if (props.throwOnError !== false && json.errors) {
      throw json.errors;
    }

    return json;
  }

  async query<TArgs extends object>(
    query: GraphQLFileName,
    props: {
      variables?: TArgs;
      throwOnError?: boolean;
    },
  ): Promise<{ data: QueryType; errors: GraphQLError[] }> {
    return this.makeRequest<QueryType, TArgs>(query, props);
  }

  async mutation<TArgs extends object>(
    query: GraphQLFileName,
    props: {
      variables?: TArgs;
      throwOnError?: boolean;
    },
  ): Promise<{ data: MutationType; errors: GraphQLError[] }> {
    return this.makeRequest<MutationType, TArgs>(query, props);
  }
}
