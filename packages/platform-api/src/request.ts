import { request as gqlRequestLib } from "graphql-request";
import type { ForwardHeaders, GraphqlRequester } from "./port";

export const defaultGraphqlRequester: GraphqlRequester = {
  async request<T>(args: {
    url: string;
    document: string;
    variables?: Record<string, unknown>;
    requestHeaders?: ForwardHeaders;
  }): Promise<T> {
    return gqlRequestLib<T>({
      url: args.url,
      document: args.document,
      variables: args.variables,
      requestHeaders: {
        "content-type": "application/json",
        ...(args.requestHeaders ?? {}),
      },
    });
  },
};
