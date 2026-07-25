import { readFileSync } from "node:fs";
import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";
import { buildSubgraphSchema } from "@apollo/subgraph";
import fastifyApollo, {
  fastifyApolloDrainPlugin,
} from "@as-integrations/fastify";
import { Injectable } from "@nestjs/common";
import type {
  AppExecutionContext,
  AppGraphQLHandlerDefinition,
  AppGraphQLModuleDefinition,
  AppHostContext,
} from "@shopana/app-sdk";
import fastify, {
  type FastifyInstance,
  type FastifyRequest,
} from "fastify";
import { GraphQLError } from "graphql";
import { gql } from "graphql-tag";
import type {
  AppGraphQLSurface,
  HostedAppDefinition,
} from "./types.js";

interface RuntimeGraphQLContext {
  readonly app?: Readonly<AppExecutionContext>;
  readonly host: AppHostContext;
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
    const schemaUrl = new URL(module.schema, hosted.moduleUrl);
    const typeDefs = gql(readFileSync(schemaUrl, "utf8"));
    const resolvers = this.createResolvers(hosted, module);
    const apollo = new ApolloServer<RuntimeGraphQLContext>({
      introspection: true,
      schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
      plugins: [
        fastifyApolloDrainPlugin(app),
        ApolloServerPluginInlineTraceDisabled(),
      ],
    });

    await apollo.start();

    await app.register(fastifyApollo(apollo), {
      path: "/graphql",
      context: async (request) =>
        this.createContext(hosted, host, request),
    });

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
        resolvers[typeName][fieldName] = (
          reference: unknown,
          context: RuntimeGraphQLContext,
        ) =>
          this.executeHandler(
            hosted,
            handler,
            reference,
            {},
            context,
          );
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
      });
    });
  }

  private async createContext(
    hosted: HostedAppDefinition,
    host: AppHostContext,
    request: FastifyRequest,
  ): Promise<RuntimeGraphQLContext> {
    const installationId =
      request.headers["x-shopana-app-installation-id"];
    if (typeof installationId !== "string" || !installationId) {
      return { host };
    }

    const app = await host.installations.resolve({
      appCode: hosted.definition.manifest.code,
      installationId,
      appVersion: hosted.definition.manifest.version,
    });
    const organizationId = request.headers["x-organization-id"];
    if (
      typeof organizationId === "string" &&
      organizationId !== app.organizationId
    ) {
      throw new GraphQLError("App installation organization mismatch", {
        extensions: { code: "APP_INSTALLATION_CONTEXT_MISMATCH" },
      });
    }
    return { app, host };
  }
}
