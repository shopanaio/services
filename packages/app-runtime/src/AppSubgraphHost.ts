import { Inject, Injectable, Logger } from "@nestjs/common";
import type { AppHostContext } from "@shopana/app-sdk";
import { AppGraphQLServerFactory } from "./AppGraphQLServerFactory.js";
import { AppSubgraphRegistry } from "./AppSubgraphRegistry.js";
import type {
  AppGraphQLSurface,
  HostedAppDefinition,
} from "./types.js";

const surfaces = ["admin", "storefront"] as const;

@Injectable()
export class AppSubgraphHost {
  private readonly logger = new Logger(AppSubgraphHost.name);

  constructor(
    @Inject(AppSubgraphRegistry)
    private readonly registry: AppSubgraphRegistry,
    @Inject(AppGraphQLServerFactory)
    private readonly serverFactory: AppGraphQLServerFactory,
  ) {}

  async start(
    hosted: HostedAppDefinition,
    host: AppHostContext,
  ): Promise<void> {
    this.validateDefinition(hosted);
    const started: AppGraphQLSurface[] = [];

    try {
      for (const surface of surfaces) {
        if (!hosted.definition.graphql?.[surface]) {
          continue;
        }

        const server = await this.serverFactory.create(hosted, surface, host);
        const address = await server.listen({
          host: "127.0.0.1",
          port: 0,
        });
        const origin = new URL(address).origin;
        this.registry.register({
          appCode: hosted.definition.manifest.code,
          surface,
          origin,
          server,
        });
        started.push(surface);
        this.logger.log(
          `App "${hosted.definition.manifest.code}" ${surface} subgraph started at ${origin}`,
        );
      }
    } catch (error) {
      for (const surface of started.reverse()) {
        await this.close(hosted.definition.manifest.code, surface);
      }
      throw error;
    }
  }

  async stop(appCode: string): Promise<void> {
    for (const surface of [...surfaces].reverse()) {
      await this.close(appCode, surface);
    }
  }

  private validateDefinition(hosted: HostedAppDefinition): void {
    for (const surface of surfaces) {
      const declared = hosted.definition.manifest.graphql[surface];
      const implemented = Boolean(hosted.definition.graphql?.[surface]);
      if (declared !== implemented) {
        throw new Error(
          `App "${hosted.definition.manifest.code}" GraphQL ${surface} declaration and runtime definition do not match`,
        );
      }
    }
  }

  private async close(
    appCode: string,
    surface: AppGraphQLSurface,
  ): Promise<void> {
    const runtime = this.registry.get(appCode, surface);
    if (!runtime) {
      return;
    }
    try {
      await runtime.server.close();
    } finally {
      this.registry.remove(appCode, surface);
    }
  }
}
