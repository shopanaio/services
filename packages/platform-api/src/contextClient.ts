import type { ServiceBroker } from "moleculer";
import type { CoreContext, CoreQuery } from "./types";
import type { CoreConfigPort, GraphqlRequester, ForwardHeaders } from "./port";

const query = `
  query ContextQuery {
    context {
      project { id name locale currency timezone email phoneNumber country }
      tenant { id tenantId email firstName lastName isReady isVerified language timezone phoneNumber }
      customer { id email firstName lastName phone isBlocked isVerified language }
    }
  }
`;

const ALLOWED_FORWARD_HEADERS = [
  "authorization",
  "x-api-key",
  "x-pj-key",
  "x-trace-id",
  "x-span-id",
  "x-correlation-id",
  "x-causation-id",
] as const;

type AllowedForwardHeader = (typeof ALLOWED_FORWARD_HEADERS)[number];

export type FetchContextHeaders = Partial<Record<AllowedForwardHeader, string>>;

export function createCoreContextClient(args: {
  config: CoreConfigPort;
  requester: GraphqlRequester;
}) {
  async function fetchContext(
    headers: FetchContextHeaders
  ): Promise<Required<CoreContext> | null> {
    const safeHeaders = ALLOWED_FORWARD_HEADERS.reduce<Record<string, string>>(
      (acc, key) => {
        const value = headers[key];
        if (value) acc[key] = value;
        return acc;
      },
      {}
    );

    try {
      const data = await args.requester.request<CoreQuery>({
        url: args.config.getCoreAppsGraphqlUrl(),
        document: query,
        variables: {},
        requestHeaders: safeHeaders as ForwardHeaders,
      });
      if (!data.context.project) return null;
      return data.context as Required<CoreContext>;
    } catch (e) {
      return null;
    }
  }

  return { fetchContext };
}

/**
 * Create a broker-based context client that uses Moleculer instead of HTTP
 */
export function createBrokerContextClient(broker: ServiceBroker) {
  async function fetchContext(
    headers: FetchContextHeaders
  ): Promise<Required<CoreContext> | null> {
    const safeHeaders = ALLOWED_FORWARD_HEADERS.reduce<Record<string, string>>(
      (acc, key) => {
        const value = headers[key];
        if (value) acc[key] = value;
        return acc;
      },
      {}
    );

    try {
      const data = await broker.call("platform.context", safeHeaders) as Required<CoreContext>;
      if (!data.project) return null;
      return data;
    } catch (e) {
      console.error("Failed to fetch context via broker:", e);
      return null;
    }
  }

  return { fetchContext };
}
