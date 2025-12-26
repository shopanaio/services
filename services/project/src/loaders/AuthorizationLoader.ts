import DataLoader from "dataloader";

export interface AuthRequest {
  userId: string;
  organizationId: string;
  resource: string;
  action: string;
  domain?: string;
}

interface BatchAuthorizeResult {
  results: boolean[];
}

interface Broker {
  call(action: string, params: unknown): Promise<unknown>;
}

/**
 * Creates a DataLoader for batching authorization requests.
 * All authorization checks within the same event loop tick are batched
 * into a single iam.batchAuthorize call.
 */
export function createAuthorizationLoader(broker: Broker) {
  return new DataLoader<AuthRequest, boolean, string>(
    async (requests) => {
      // Group requests by organizationId (batchAuthorize requires same org)
      const byOrg = new Map<
        string,
        { index: number; request: AuthRequest }[]
      >();

      requests.forEach((request, index) => {
        const orgRequests = byOrg.get(request.organizationId) ?? [];
        orgRequests.push({ index, request });
        byOrg.set(request.organizationId, orgRequests);
      });

      // Initialize results array
      const results: boolean[] = new Array(requests.length).fill(false);

      // Process each organization's requests in parallel
      await Promise.all(
        Array.from(byOrg.entries()).map(
          async ([organizationId, orgRequests]) => {
            const { results: batchResults } = (await broker.call(
              "iam.batchAuthorize",
              {
                organizationId,
                requests: orgRequests.map(({ request }) => ({
                  userId: request.userId,
                  domain: request.domain,
                  resource: request.resource,
                  action: request.action,
                })),
              }
            )) as BatchAuthorizeResult;

            // Map results back to original indices
            orgRequests.forEach(({ index }, i) => {
              results[index] = batchResults[i] ?? false;
            });
          }
        )
      );

      return results;
    },
    {
      // Cache key based on all authorization parameters
      cacheKeyFn: (req) =>
        `${req.userId}:${req.organizationId}:${req.domain ?? ""}:${
          req.resource
        }:${req.action}`,
    }
  );
}

export type AuthorizationLoader = ReturnType<typeof createAuthorizationLoader>;
