import { ApolloClient, InMemoryCache } from "@apollo/client-integration-nextjs";
import { HttpLink, from } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { ErrorLink } from "@apollo/client/link/error";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { Observable } from "rxjs";
import {
  getAccessToken,
  getRefreshToken,
  setStoredTokens,
  clearStoredTokens,
} from "@/domains/auth/utils";
import { TOKEN_REFRESH_MUTATION } from "@/domains/auth/graphql";

const GRAPHQL_ENDPOINT =
  process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || "http://localhost:4001/graphql";

let isRefreshing = false;
let pendingRequests: Array<() => void> = [];

function resolvePendingRequests() {
  pendingRequests.forEach((callback) => callback());
  pendingRequests = [];
}

const authLink = setContext((_, { headers }) => {
  const token = getAccessToken();

  return {
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
});

const errorLink = new ErrorLink(({ error, operation, forward }) => {
  if (!CombinedGraphQLErrors.is(error)) {
    return;
  }

  const isUnauthenticated = error.errors.some(
    (e) => e.extensions?.code === "UNAUTHENTICATED"
  );

  if (!isUnauthenticated) {
    return;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearStoredTokens();
    return;
  }

  if (isRefreshing) {
    return new Observable((observer) => {
      pendingRequests.push(() => {
        forward(operation).subscribe(observer);
      });
    });
  }

  isRefreshing = true;

  return new Observable((observer) => {
    fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: TOKEN_REFRESH_MUTATION.loc?.source.body,
        variables: { input: { refreshToken } },
      }),
    })
      .then((response) => response.json())
      .then((result) => {
        const token = result?.data?.authMutation?.tokenRefresh?.token;

        if (token) {
          setStoredTokens(token.accessToken, token.refreshToken, token.expiresIn);
          resolvePendingRequests();

          const oldHeaders = operation.getContext().headers;
          operation.setContext({
            headers: {
              ...oldHeaders,
              Authorization: `Bearer ${token.accessToken}`,
            },
          });

          forward(operation).subscribe(observer);
        } else {
          clearStoredTokens();
          observer.error(new Error("Token refresh failed"));
        }
      })
      .catch(() => {
        clearStoredTokens();
        observer.error(new Error("Token refresh failed"));
      })
      .finally(() => {
        isRefreshing = false;
      });
  });
});

export function makeClient() {
  const httpLink = new HttpLink({
    uri: GRAPHQL_ENDPOINT,
    credentials: "include",
    fetchOptions: { cache: "no-store" },
  });

  return new ApolloClient({
    cache: new InMemoryCache(),
    link: from([errorLink, authLink, httpLink]),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: "cache-and-network",
      },
    },
  });
}
