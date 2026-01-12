import {
  ApolloClient,
  InMemoryCache,
  registerApolloClient,
} from "@apollo/client-integration-nextjs";
import { HttpLink } from "@apollo/client";

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || "http://localhost:4000/graphql";

function makeClient() {
  const httpLink = new HttpLink({
    uri: GRAPHQL_ENDPOINT,
    fetchOptions: { cache: "no-store" },
  });

  return new ApolloClient({
    cache: new InMemoryCache(),
    link: httpLink,
    defaultOptions: {
      watchQuery: {
        fetchPolicy: "cache-and-network",
      },
    },
  });
}

// For client components
export { makeClient };

// For server components (RSC) - isolated per request
export const { getClient, query, PreloadQuery } = registerApolloClient(makeClient);
