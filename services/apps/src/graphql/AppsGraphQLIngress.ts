import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { getServiceConfig } from "@shopana/shared-service-config";
import fastify, {
  type FastifyInstance,
  type FastifyRequest,
} from "fastify";
import {
  AppSubgraphRegistry,
  type AppGraphQLSurface,
} from "./AppSubgraphRegistry.js";

interface AppsServiceConfig {
  readonly ports?: {
    readonly admin_graphql?: number;
    readonly storefront_graphql?: number;
  };
}

const hopByHopHeaders = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

@Injectable()
export class AppsGraphQLIngress implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AppsGraphQLIngress.name);
  private readonly servers = new Map<AppGraphQLSurface, FastifyInstance>();

  constructor(private readonly registry: AppSubgraphRegistry) {}

  async onModuleInit(): Promise<void> {
    const { service } = getServiceConfig("apps");
    const config = service as AppsServiceConfig;
    await this.startSurface("admin", config.ports?.admin_graphql);
    await this.startSurface("storefront", config.ports?.storefront_graphql);
  }

  async onModuleDestroy(): Promise<void> {
    for (const server of [...this.servers.values()].reverse()) {
      await server.close();
    }
    this.servers.clear();
  }

  private async startSurface(
    surface: AppGraphQLSurface,
    port: number | undefined,
  ): Promise<void> {
    if (!port) {
      return;
    }

    const app = fastify({
      disableRequestLogging: true,
    });

    app.all<{
      Params: { appCode: string };
    }>("/subgraphs/:appCode/graphql", async (request, reply) => {
      const runtime = this.registry.get(request.params.appCode, surface);
      if (!runtime) {
        return reply.code(503).send({
          code: "APP_SUBGRAPH_NOT_READY",
          appCode: request.params.appCode,
          surface,
        });
      }

      const response = await fetch(`${runtime.origin}/graphql`, {
        method: request.method,
        headers: this.buildHeaders(request, runtime.appCode, surface),
        body: this.buildBody(request),
      });

      response.headers.forEach((value, name) => {
        if (!hopByHopHeaders.has(name.toLowerCase())) {
          reply.header(name, value);
        }
      });

      const body = Buffer.from(await response.arrayBuffer());
      return reply.code(response.status).send(body);
    });

    app.get("/healthz", async () => ({
      status: "ok",
      service: "apps",
      surface,
    }));

    await app.listen({
      host: "0.0.0.0",
      port,
    });
    this.servers.set(surface, app);
    this.logger.log(`Apps ${surface} GraphQL ingress started on port ${port}`);
  }

  private buildHeaders(
    request: FastifyRequest,
    appCode: string,
    surface: AppGraphQLSurface,
  ): Headers {
    const headers = new Headers();
    for (const [name, rawValue] of Object.entries(request.headers)) {
      if (hopByHopHeaders.has(name.toLowerCase()) || rawValue === undefined) {
        continue;
      }
      headers.set(name, Array.isArray(rawValue) ? rawValue.join(",") : rawValue);
    }
    headers.set("x-shopana-app-code", appCode);
    headers.set("x-shopana-app-surface", surface);
    return headers;
  }

  private buildBody(request: FastifyRequest): BodyInit | undefined {
    if (request.method === "GET" || request.method === "HEAD") {
      return undefined;
    }
    if (request.body === undefined || request.body === null) {
      return undefined;
    }
    if (typeof request.body === "string" || Buffer.isBuffer(request.body)) {
      return request.body;
    }
    return JSON.stringify(request.body);
  }
}
