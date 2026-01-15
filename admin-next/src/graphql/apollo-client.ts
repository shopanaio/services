import { ApolloClient, InMemoryCache } from "@apollo/client-integration-nextjs";
import { HttpLink, ApolloLink } from "@apollo/client";
import { ErrorLink } from "@apollo/client/link/error";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { Observable } from "rxjs";
import {
  getAccessToken,
  getRefreshToken,
  getStoredTokens,
  setStoredTokens,
  clearStoredTokens,
} from "@/domains/auth/utils";
import { TOKEN_REFRESH_MUTATION } from "@/domains/auth/graphql";

const GRAPHQL_ENDPOINT =
  process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || "http://localhost:4001/graphql";

// Extract store name from URL path (pattern: /:orgName/:storeName/...)
function getStoreNameFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const segments = window.location.pathname.split("/").filter(Boolean);
  // URL pattern: /orgName/storeName/...
  return segments.length >= 2 ? segments[1] : null;
}

// Refresh token 60 seconds before expiry to avoid race conditions
const TOKEN_REFRESH_BUFFER_MS = 60 * 1000;

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

function shouldRefreshToken(): boolean {
  const tokens = getStoredTokens();
  if (!tokens) return false;

  // Proactively refresh if token expires within buffer time
  return Date.now() >= tokens.expiresAt - TOKEN_REFRESH_BUFFER_MS;
}

async function performTokenRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearStoredTokens();
    return null;
  }

  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: TOKEN_REFRESH_MUTATION.loc?.source.body,
        variables: { input: { refreshToken } },
      }),
    });

    const result = await response.json();
    const token = result?.data?.authMutation?.tokenRefresh?.token;

    if (token) {
      setStoredTokens(token.accessToken, token.refreshToken, token.expiresIn);
      return token.accessToken;
    }

    clearStoredTokens();
    return null;
  } catch {
    clearStoredTokens();
    return null;
  }
}

async function ensureFreshToken(): Promise<string | null> {
  const currentToken = getAccessToken();

  // No token - nothing to refresh
  if (!currentToken) return null;

  // Token is still fresh - use it
  if (!shouldRefreshToken()) return currentToken;

  // Token needs refresh - deduplicate concurrent refresh attempts
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = performTokenRefresh().finally(() => {
    isRefreshing = false;
    refreshPromise = null;
  });

  return refreshPromise;
}

// Proactive token refresh link - refreshes token BEFORE request if needed
const proactiveRefreshLink = new ApolloLink((operation, forward) => {
  return new Observable((observer) => {
    ensureFreshToken()
      .then((token) => {
        const oldHeaders = operation.getContext().headers || {};
        const headers: Record<string, string> = { ...oldHeaders };

        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const storeName = getStoreNameFromUrl();
        if (storeName) {
          headers["x-store-name"] = storeName;
        }

        operation.setContext({ headers });
        forward(operation).subscribe(observer);
      })
      .catch(() => {
        // If proactive refresh fails, still try the request
        // The error link will handle 401 as fallback
        forward(operation).subscribe(observer);
      });
  });
});

// Fallback error link - handles 401 if proactive refresh missed it
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

  // Use the same refresh mechanism to avoid duplicate refreshes
  return new Observable((observer) => {
    ensureFreshToken()
      .then((token) => {
        if (token) {
          const oldHeaders = operation.getContext().headers || {};
          const headers: Record<string, string> = {
            ...oldHeaders,
            Authorization: `Bearer ${token}`,
          };

          const storeName = getStoreNameFromUrl();
          if (storeName) {
            headers["x-store-name"] = storeName;
          }

          operation.setContext({ headers });
          forward(operation).subscribe(observer);
        } else {
          observer.error(new Error("Token refresh failed"));
        }
      })
      .catch(() => {
        observer.error(new Error("Token refresh failed"));
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
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            userQuery: { merge: true },
          },
        },
      },
    }),
    // Order: errorLink (fallback 401) -> proactiveRefreshLink (proactive refresh + auth header) -> httpLink
    link: ApolloLink.from([errorLink, proactiveRefreshLink, httpLink]),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: "cache-and-network",
      },
    },
  });
}
