import type { ForwardHeaders } from "./port";
import { defaultGraphqlRequester } from "./request";
import type { CoreConfigPort } from "./port";

export async function gqlRequest<T>(
  config: CoreConfigPort,
  query: string,
  variables: Record<string, unknown>,
  headers: Record<string, string>
): Promise<T> {
  return defaultGraphqlRequester.request<T>({
    url: config.getCoreAppsGraphqlUrl(),
    document: query,
    variables,
    requestHeaders: headers as ForwardHeaders,
  });
}
