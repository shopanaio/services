export type ForwardHeaders = Record<string, string>;

export interface GraphqlRequester {
  request<T>(args: {
    url: string;
    document: string;
    variables?: Record<string, unknown>;
    requestHeaders?: ForwardHeaders;
  }): Promise<T>;
}

export interface CoreConfigPort {
  getCoreAppsGraphqlUrl(): string;
}

export interface CoreContextClientPort {
  fetchContext(headers: ForwardHeaders): Promise<unknown>;
}
