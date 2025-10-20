import { request } from "graphql-request";
import type { ForwardHeaders } from "./port";

/**
 * Simple GraphQL request helper for direct Core Apps GraphQL API access
 * This is kept for backward compatibility with plugins that need to query
 * the Core Apps GraphQL API directly (not context service)
 */
export async function gqlRequest<T>(
  config: { getCoreAppsGraphqlUrl(): string },
  query: string,
  variables: Record<string, unknown>,
  headers: Record<string, string>
): Promise<T> {
  return request<T>({
    url: config.getCoreAppsGraphqlUrl(),
    document: query,
    variables,
    requestHeaders: {
      "content-type": "application/json",
      ...headers,
    } as ForwardHeaders,
  });
}
