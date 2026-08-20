import { timingSafeEqual } from "node:crypto";
import fastify, { type FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppLogger } from "@shopana/app-sdk";
import { StorefrontCredentialResolver } from "./StorefrontCredentialResolver.js";

const requestSchema = z
  .object({
    token: z.string().min(1).max(128),
    accessMode: z.enum(["PUBLIC", "PRIVATE"]),
    buyerIp: z.string().ip().optional(),
    requestId: z.string().trim().min(1).max(255),
  })
  .strict();

export class StorefrontAccessInternalServer {
  private server: FastifyInstance | null = null;

  constructor(
    private readonly resolver: StorefrontCredentialResolver,
    private readonly port: number,
    private readonly serviceToken: string,
    private readonly logger: AppLogger,
  ) {
    if (!Number.isInteger(port) || port < 1 || port > 65_535) {
      throw new Error("Headless internal port is invalid");
    }
    if (Buffer.byteLength(serviceToken) < 32) {
      throw new Error("STOREFRONT_RESOLVER_INTERNAL_TOKEN must be at least 32 bytes");
    }
  }

  async start(): Promise<void> {
    if (this.server) return;
    this.resolver.start();
    const app = fastify({
      disableRequestLogging: true,
      bodyLimit: 16_384,
    });
    app.post("/internal/storefront-access/resolve", async (request, reply) => {
      if (!this.authorized(request.headers.authorization)) {
        return reply.code(401).send({ code: "UNAUTHORIZED" });
      }
      const parsed = requestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ code: "INVALID_REQUEST" });
      }
      try {
        const result = await this.resolver.resolve(parsed.data);
        if (!result) {
          return reply.code(401).send({ code: "STOREFRONT_CREDENTIAL_INVALID" });
        }
        return reply.send(result);
      } catch (error) {
        this.logger.error("Storefront credential resolution failed", error);
        return reply.code(503).send({ code: "STOREFRONT_ACCESS_UNAVAILABLE" });
      }
    });
    app.get("/healthz", async () => ({
      status: "ok",
      service: "shopana-headless-storefront-access",
    }));
    await app.listen({ host: "127.0.0.1", port: this.port });
    this.server = app;
  }

  async stop(): Promise<void> {
    const server = this.server;
    this.server = null;
    await server?.close();
    await this.resolver.stop();
  }

  private authorized(value: string | undefined): boolean {
    if (!value?.startsWith("Bearer ")) return false;
    const received = Buffer.from(value.slice(7), "utf8");
    const expected = Buffer.from(this.serviceToken, "utf8");
    return received.length === expected.length && timingSafeEqual(received, expected);
  }
}
