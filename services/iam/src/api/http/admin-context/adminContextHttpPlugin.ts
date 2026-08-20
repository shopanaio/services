import { timingSafeEqual } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { Kernel } from "../../../kernel/Kernel.js";
import { AdminContextResolver } from "./AdminContextResolver.js";

const requestSchema = z
  .object({
    accessToken: z.string().min(1).max(16_384),
    organizationId: z.string().trim().min(1).max(255).optional(),
    storeName: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(63)
      .optional(),
    requestId: z.string().trim().min(1).max(255),
  })
  .strict();

export interface AdminContextHttpPluginOptions {
  readonly kernel: Kernel;
  readonly serviceToken: string;
}

export const adminContextHttpPlugin: FastifyPluginAsync<AdminContextHttpPluginOptions> = async (
  instance,
  options,
) => {
  if (Buffer.byteLength(options.serviceToken, "utf8") < 32) {
    throw new Error("ADMIN_CONTEXT_RESOLVER_INTERNAL_TOKEN must be at least 32 bytes");
  }
  const resolver = new AdminContextResolver(options.kernel);

  instance.post(
    "/internal/admin-context/resolve",
    { config: { bodyLimit: 32_768 } },
    async (request, reply) => {
      if (!authorized(request.headers.authorization, options.serviceToken)) {
        return reply.code(401).send({ code: "UNAUTHORIZED" });
      }
      const parsed = requestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ code: "INVALID_REQUEST" });
      }
      try {
        const context = await resolver.resolve(parsed.data);
        if (!context) {
          return reply.code(401).send({ code: "ADMIN_CONTEXT_INVALID" });
        }
        return reply.send(context);
      } catch (error) {
        request.log.error(
          { err: error, requestId: parsed.data.requestId },
          "Admin context resolution failed",
        );
        return reply.code(503).send({ code: "ADMIN_CONTEXT_UNAVAILABLE" });
      }
    },
  );
};

function authorized(value: string | undefined, serviceToken: string): boolean {
  if (!value?.startsWith("Bearer ")) return false;
  const received = Buffer.from(value.slice(7), "utf8");
  const expected = Buffer.from(serviceToken, "utf8");
  return received.length === expected.length && timingSafeEqual(received, expected);
}
