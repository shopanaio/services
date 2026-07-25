import { Injectable, Logger } from "@nestjs/common";
import type {
  AppHostContext,
  ShopanaAppDefinition,
} from "@shopana/app-sdk";
import {
  AppSubgraphRegistry,
  type AppGraphQLSurface,
} from "./AppSubgraphRegistry.js";

const surfaces = ["admin", "storefront"] as const;

@Injectable()
export class AppSubgraphHost {
  private readonly logger = new Logger(AppSubgraphHost.name);

  constructor(private readonly registry: AppSubgraphRegistry) {}

  async start(
    definition: ShopanaAppDefinition,
    host: AppHostContext,
  ): Promise<void> {
    this.validateDefinition(definition);
    const started: AppGraphQLSurface[] = [];

    try {
      for (const surface of surfaces) {
        const surfaceDefinition = definition.graphql?.[surface];
        if (!surfaceDefinition) {
          continue;
        }

        const server = await surfaceDefinition.createServer(host);
        const address = await server.listen({
          host: "127.0.0.1",
          port: 0,
        });
        const origin = this.parseOrigin(
          definition.manifest.code,
          surface,
          address,
        );

        this.registry.register({
          appCode: definition.manifest.code,
          surface,
          origin,
          server,
        });
        started.push(surface);
        this.logger.log(
          `App "${definition.manifest.code}" ${surface} subgraph started at ${origin}`,
        );
      }
    } catch (error) {
      for (const surface of started.reverse()) {
        await this.close(definition.manifest.code, surface);
      }
      throw error;
    }
  }

  async stop(appCode: string): Promise<void> {
    for (const surface of [...surfaces].reverse()) {
      await this.close(appCode, surface);
    }
  }

  private validateDefinition(definition: ShopanaAppDefinition): void {
    for (const surface of surfaces) {
      const declared = definition.manifest.graphql[surface];
      const implemented = Boolean(definition.graphql?.[surface]);
      if (declared !== implemented) {
        throw new Error(
          `App "${definition.manifest.code}" GraphQL ${surface} declaration and runtime definition do not match`,
        );
      }
    }
  }

  private parseOrigin(
    appCode: string,
    surface: AppGraphQLSurface,
    address: string,
  ): string {
    const url = new URL(address);
    if (!url.port) {
      throw new Error(
        `App "${appCode}" ${surface} subgraph did not return a TCP port`,
      );
    }
    return url.origin;
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
