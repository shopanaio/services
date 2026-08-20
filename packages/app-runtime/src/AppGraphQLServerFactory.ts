import { readFileSync } from "node:fs";
import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";
import { buildSubgraphSchema } from "@apollo/subgraph";
import fastifyApollo, { fastifyApolloDrainPlugin } from "@as-integrations/fastify";
import { Injectable } from "@nestjs/common";
import type {
  AppExecutionContext,
  AppGraphQLHandlerDefinition,
  AppGraphQLModuleDefinition,
  AppHostContext,
} from "@shopana/app-sdk";
import fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import { GraphQLError } from "graphql";
import { gql } from "graphql-tag";
import {
  buildAdminContextMiddleware,
  type AdminContextClaims,
  STOREFRONT_CONTEXT_HEADER,
  StorefrontContextVerifier,
} from "@shopana/shared-context";
import type { AppGraphQLSurface, HostedAppDefinition } from "./types.js";

interface RuntimeGraphQLContext {
  readonly app?: Readonly<AppExecutionContext>;
  readonly host: AppHostContext;
  readonly adminContext?: AdminContextClaims;
}

@Injectable()
export class AppGraphQLServerFactory {
  async create(
    hosted: HostedAppDefinition,
    surface: AppGraphQLSurface,
    host: AppHostContext,
  ): Promise<FastifyInstance> {
    const module = hosted.definition.graphql?.[surface];
    if (!module) {
      throw new Error(
        `App "${hosted.definition.manifest.code}" does not provide ${surface} GraphQL`,
      );
    }

    const app = fastify({
      disableRequestLogging: true,
    });
    const schemaPaths = typeof module.schema === "string" ? [module.schema] : module.schema;
    const typeDefs = schemaPaths.map((schemaPath) => {
      const schemaUrl = new URL(schemaPath, hosted.moduleUrl);
      return gql(readFileSync(schemaUrl, "utf8"));
    });
    const resolvers = this.createResolvers(hosted, module);
    const apollo = new ApolloServer<RuntimeGraphQLContext>({
      introspection: true,
      schema: buildSubgraphSchema(
        typeDefs.map((document, index) => ({
          typeDefs: document,
          ...(index === 0 ? { resolvers } : {}),
        })),
      ),
      plugins: [fastifyApolloDrainPlugin(app), ApolloServerPluginInlineTraceDisabled()],
    });

    await apollo.start();

    const registerGraphQL = async (instance: FastifyInstance) => {
      await instance.register(fastifyApollo(apollo), {
        path: "/graphql",
        context: async (request) => this.createContext(hosted, host, request, surface),
      });
    };
    if (surface === "admin") {
      await app.register(async (instance) => {
        instance.addHook(
          "preHandler",
          buildAdminContextMiddleware(undefined, {
            serviceName: `APP:${hosted.definition.manifest.code}`,
          }),
        );
        await registerGraphQL(instance);
      });
    } else {
      await registerGraphQL(app);
    }

    app.get("/healthz", async () => ({
      status: "ok",
      app: hosted.definition.manifest.code,
      surface,
    }));

    return app;
  }

  private createResolvers(
    hosted: HostedAppDefinition,
    module: AppGraphQLModuleDefinition,
  ): Record<string, Record<string, any>> {
    const resolvers: Record<string, Record<string, any>> = {};

    for (const [path, handler] of Object.entries(module.handlers)) {
      const [typeName, fieldName, ...rest] = path.split(".");
      if (!typeName || !fieldName || rest.length > 0) {
        throw new Error(
          `App "${hosted.definition.manifest.code}" has invalid GraphQL handler path "${path}"`,
        );
      }
      resolvers[typeName] ??= {};
      if (fieldName === "__resolveReference") {
        resolvers[typeName][fieldName] = (reference: unknown, context: RuntimeGraphQLContext) =>
          this.executeHandler(hosted, handler, reference, {}, context);
        continue;
      }
      resolvers[typeName][fieldName] = (
        parent: unknown,
        args: Record<string, unknown>,
        context: RuntimeGraphQLContext,
      ) => this.executeHandler(hosted, handler, parent, args, context);
    }

    return resolvers;
  }

  private executeHandler(
    hosted: HostedAppDefinition,
    handler: AppGraphQLHandlerDefinition,
    parent: unknown,
    args: Record<string, unknown>,
    context: RuntimeGraphQLContext,
  ): Promise<unknown> | unknown {
    const app = context.app;
    if (!app) {
      throw new GraphQLError("Active App installation is required", {
        extensions: { code: "APP_INSTALLATION_REQUIRED" },
      });
    }

    return context.host.executionContext.run(app, () => {
      if (handler.kind === "action") {
        return context.host.broker.call(
          `apps.${hosted.definition.manifest.code}.${handler.action}`,
          args,
        );
      }
      return handler.handler(parent, args, {
        app,
        host: context.host,
        adminContext: context.adminContext,
      });
    });
  }

  private async createContext(
    hosted: HostedAppDefinition,
    host: AppHostContext,
    request: FastifyRequest,
    surface: AppGraphQLSurface,
  ): Promise<RuntimeGraphQLContext> {
    if (surface === "storefront") {
      const raw = request.headers[STOREFRONT_CONTEXT_HEADER];
      if (typeof raw !== "string") return { host };
      const claims = new StorefrontContextVerifier().verify(raw);
      const app = await host.installations.resolve({
        appCode: hosted.definition.manifest.code,
        installationId: claims.storefront.installationId,
        appVersion: hosted.definition.manifest.version,
      });
      if (app.storeId !== claims.store.id || app.organizationId !== claims.organizationId) {
        throw new GraphQLError("App installation storefront mismatch", {
          extensions: { code: "APP_INSTALLATION_CONTEXT_MISMATCH" },
        });
      }
      return { app, host };
    }
    const storeName = request.headers["x-store-name"];
    if (typeof storeName !== "string" || !storeName) {
      return { host };
    }

    const app = await host.installations.resolveActive({
      appCode: hosted.definition.manifest.code,
      storeName,
      appVersion: hosted.definition.manifest.version,
    });
    const adminContext = (
      request as FastifyRequest & {
        readonly adminContext?: AdminContextClaims;
      }
    ).adminContext;
    if (!adminContext?.store) {
      return { host };
    }
    const organizationId = request.headers["x-organization-id"];
    if (
      adminContext.store.id !== app.storeId ||
      adminContext.store.organizationId !== app.organizationId ||
      adminContext.organizationId !== app.organizationId ||
      (typeof organizationId === "string" && organizationId !== app.organizationId)
    ) {
      throw new GraphQLError("App installation organization mismatch", {
        extensions: { code: "APP_INSTALLATION_CONTEXT_MISMATCH" },
      });
    }
    return {
      app: Object.freeze({
        ...app,
        actor: Object.freeze({
          type: "USER" as const,
          id: adminContext.user.id,
        }),
      }),
      host,
      adminContext,
    };
  }
}
