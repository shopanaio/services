import fastify, { type FastifyInstance } from "fastify";
import { isDevelopment } from "@shopana/shared-service-config";
import type { GlobalConfig } from "@shopana/shared-service-config";
import { adminGraphqlPlugin } from "../graphql-admin/server.js";
import type { Kernel } from "../../kernel/Kernel.js";
import { adminContextHttpPlugin } from "./admin-context/index.js";
import { applicationAuthHttpPlugin } from "./application-auth/applicationAuthHttpPlugin.js";
import type { IamHttpRuntimeConfiguration } from "./iamHttpConfiguration.js";

export interface IamHttpServerOptions {
  kernel: Kernel;
  global: GlobalConfig;
  http: IamHttpRuntimeConfiguration;
}

/** Create the single IAM listener and register transport siblings. */
export async function startIamHttpServer(options: IamHttpServerOptions): Promise<FastifyInstance> {
  const app = fastify({
    disableRequestLogging: true,
    trustProxy: options.http.trustedProxyCidrs.length > 0 ? options.http.trustedProxyCidrs : false,
    logger: isDevelopment(options.global)
      ? {
          level: options.global.log_level ?? "info",
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:HH:MM:ss.l",
              ignore: "pid,hostname,reqId,responseTime",
              messageFormat: "[IAM] {msg}",
              levelFirst: true,
            },
          },
        }
      : { level: options.global.log_level ?? "info" },
  });

  await app.register(applicationAuthHttpPlugin, {
    kernel: options.kernel,
    publicBaseUrl: options.http.publicBaseUrl,
  });
  await app.register(adminContextHttpPlugin, {
    kernel: options.kernel,
    serviceToken: requiredEnvironment("ADMIN_CONTEXT_RESOLVER_INTERNAL_TOKEN"),
  });
  await app.register(adminGraphqlPlugin, {
    kernel: options.kernel,
    rootApp: app,
  });

  app.get("/", async (_request, reply) =>
    reply.send({
      status: "ok",
      service: "iam",
      environment: options.global.environment,
    }),
  );
  app.get("/healthz", async (_request, reply) => reply.send({ status: "ok", service: "iam" }));
  await app.listen({ port: options.http.port, host: "0.0.0.0" });
  return app;
}

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
