import type { ServiceBroker } from "@shopana/shared-kernel";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import type { CoreContext } from "./types";
import type { GrpcConfigPort, ForwardHeaders } from "./port";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

/**
 * Map proto timestamp to ISO string
 */
function mapTimestamp(timestamp: any): string {
  if (!timestamp) return new Date().toISOString();
  if (timestamp.seconds) {
    const milliseconds = Number(timestamp.seconds) * 1000 + (timestamp.nanos || 0) / 1000000;
    return new Date(milliseconds).toISOString();
  }
  return new Date().toISOString();
}

/**
 * Map gRPC response to CoreContext types
 */
function mapGrpcContextToCore(grpcContext: any): Required<CoreContext> | null {
  if (!grpcContext || !grpcContext.project) {
    return null;
  }

  const result: Required<CoreContext> = {
    __typename: "Context",
    project: {
      __typename: "Project",
      id: grpcContext.project.id || "",
      name: grpcContext.project.name || "",
      locale: grpcContext.project.locale || "",
      currency: grpcContext.project.currency || "",
      timezone: grpcContext.project.timezone || "",
      email: grpcContext.project.email || "",
      phoneNumber: grpcContext.project.phone_number || "",
      country: grpcContext.project.country || "",
      locales: (grpcContext.project.locales || []).map((l: any) => ({
        __typename: "Locale",
        code: l.code || "",
        isActive: l.is_active || false,
      })),
      currencies: (grpcContext.project.currencies || []).map((c: any) => ({
        __typename: "Currency",
        code: c.code || "",
        isActive: c.is_active || false,
        exchangeRate: c.exchange_rate || 1.0,
      })),
      stockStatuses: (grpcContext.project.stock_statuses || []).map((s: any) => ({
        __typename: "StockStatus",
        code: s.code || "",
      })),
    },
    tenant: grpcContext.tenant ? {
      __typename: "User",
      id: grpcContext.tenant.id || "",
      tenantId: grpcContext.tenant.tenant_id || "",
      email: grpcContext.tenant.email || "",
      firstName: grpcContext.tenant.first_name || "",
      lastName: grpcContext.tenant.last_name || "",
      isReady: grpcContext.tenant.is_ready || false,
      isVerified: grpcContext.tenant.is_verified || false,
      language: grpcContext.tenant.language || "",
      phoneNumber: grpcContext.tenant.phone_number || null,
      timezone: grpcContext.tenant.timezone || "",
      createdAt: mapTimestamp(grpcContext.tenant.created_at),
      updatedAt: mapTimestamp(grpcContext.tenant.updated_at),
    } : null,
    customer: grpcContext.customer ? {
      __typename: "Customer",
      id: grpcContext.customer.id || "",
      email: grpcContext.customer.email || "",
      firstName: grpcContext.customer.first_name || "",
      lastName: grpcContext.customer.last_name || "",
      phone: grpcContext.customer.phone || null,
      isBlocked: grpcContext.customer.is_blocked || false,
      isVerified: grpcContext.customer.is_verified || false,
      language: grpcContext.customer.language || null,
      createdAt: mapTimestamp(grpcContext.customer.created_at),
      updatedAt: mapTimestamp(grpcContext.customer.updated_at),
    } : null,
  };

  return result;
}

/**
 * Load proto definitions
 */
function loadProtoDefinition() {
  const PROTO_PATH = join(__dirname, "../../platform-proto/proto/context.proto");
  const COMMON_PROTO_PATH = join(__dirname, "../../platform-proto/proto/common.proto");

  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [join(__dirname, "../../platform-proto/proto")],
  });

  return grpc.loadPackageDefinition(packageDefinition);
}

/**
 * Create gRPC-based context client
 */
export function createCoreContextClient(args: {
  config: GrpcConfigPort;
}) {
  const protoDescriptor = loadProtoDefinition();
  const appsV1 = (protoDescriptor as any).apps.v1;

  async function fetchContext(
    headers: FetchContextHeaders
  ): Promise<Required<CoreContext> | null> {
    const client = new appsV1.ContextService(
      args.config.getGrpcHost(),
      grpc.credentials.createInsecure()
    );

    const metadata = new grpc.Metadata();

    // Map headers to gRPC metadata
    ALLOWED_FORWARD_HEADERS.forEach((key) => {
      const value = headers[key];
      if (value) {
        metadata.add(key, value);
      }
    });

    return new Promise((resolve, reject) => {
      client.GetContext({}, metadata, (error: any, response: any) => {
        if (error) {
          console.error("gRPC GetContext error:", error);
          resolve(null);
          return;
        }

        try {
          const mappedContext = mapGrpcContextToCore(response?.context);
          resolve(mappedContext);
        } catch (err) {
          console.error("Error mapping gRPC context:", err);
          resolve(null);
        }
      });
    });
  }

  return { fetchContext };
}

/**
 * Create a broker-based context client that uses Moleculer instead of gRPC
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
