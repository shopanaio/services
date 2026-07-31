import { Inject, Injectable } from "@nestjs/common";
import { ADMIN_CONTEXT_HEADER } from "@shopana/shared-context";
import fastify, {
  type FastifyInstance,
  type FastifyRequest,
} from "fastify";
import { AppSubgraphRegistry } from "./AppSubgraphRegistry.js";
import type {
  AppGraphQLSurface,
  AppsGraphQLIngressPorts,
} from "./types.js";

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

const adminForwardHeaders = new Set([
  "accept",
  "authorization",
  "content-type",
  "traceparent",
  "tracestate",
  "user-agent",
  "x-organization-id",
  "x-request-id",
  ADMIN_CONTEXT_HEADER,
  "x-store-name",
]);

const storefrontForwardHeaders = new Set([
  "accept",
  "authorization",
  "content-type",
  "traceparent",
  "tracestate",
  "user-agent",
  "x-request-id",
  "x-shopana-storefront-context",
]);

@Injectable()
export class AppsGraphQLIngress {
  private readonly servers = new Map<AppGraphQLSurface, FastifyInstance>();

  constructor(
    @Inject(AppSubgraphRegistry)
    private readonly registry: AppSubgraphRegistry,
  ) {}

  async start(ports: AppsGraphQLIngressPorts): Promise<void> {
    await this.startSurface("admin", ports.admin);
    await this.startSurface("storefront", ports.storefront);
  }

  async stop(): Promise<void> {
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
      return reply
        .code(response.status)
        .send(Buffer.from(await response.arrayBuffer()));
    });
    app.get("/healthz", async () => ({
      status: "ok",
      service: "apps",
      surface,
    }));

    await app.listen({ host: "0.0.0.0", port });
    this.servers.set(surface, app);
  }

  private buildHeaders(
    request: FastifyRequest,
    appCode: string,
    surface: AppGraphQLSurface,
  ): Headers {
    const headers = new Headers();
    for (const [name, rawValue] of Object.entries(request.headers)) {
      const normalizedName = name.toLowerCase();
      if (
        hopByHopHeaders.has(normalizedName) ||
        !(surface === "admin"
          ? adminForwardHeaders
          : storefrontForwardHeaders
        ).has(normalizedName) ||
        rawValue === undefined
      ) {
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
    if (typeof request.body === "string") {
      return request.body;
    }
    if (Buffer.isBuffer(request.body)) {
      return request.body.toString("utf8");
    }
    return JSON.stringify(request.body);
  }
}
