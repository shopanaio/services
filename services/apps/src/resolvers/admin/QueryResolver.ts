import { ApolloQuery } from "@shopana/type-resolver";
import { AppsType } from "./AppsType.js";
import {
  AppDefinitionResolver,
  AppInstallationResolver,
  SalesChannelConnectionConnectionResolver,
  SalesChannelConnectionResolver,
  SalesChannelSpecificationResolver,
} from "./SalesChannelResolvers.js";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";

@ApolloQuery
export class QueryResolver extends AppsType<Record<string, never>> {
  appsQuery() {
    return new AppsQueryResolver({}, this.$ctx);
  }
}

/**
 * Namespace resolver. Domain query fields are added here as they are implemented.
 */
export class AppsQueryResolver extends AppsType<Record<string, never>> {
  appDefinition(args: { code: string }) {
    const runtime = this.$ctx.runtimes.get(args.code);
    return runtime
      ? new AppDefinitionResolver(runtime.definition, this.$ctx)
      : null;
  }

  availableApps() {
    return this.$ctx.runtimes
      .list()
      .map(
        ({ definition }) => new AppDefinitionResolver(definition, this.$ctx),
      );
  }

  async appInstallation(args: { id: string }) {
    const id = this.decodeId(args.id, GlobalIdEntity.AppInstallation);
    const row =
      await this.$ctx.repository.installation.findByIdForStore(id);
    return row ? new AppInstallationResolver(row, this.$ctx) : null;
  }

  async salesChannelSpecification(args: { id: string }) {
    const id = this.decodeId(
      args.id,
      GlobalIdEntity.SalesChannelSpecification,
    );
    const row =
      await this.$ctx.repository.salesChannelSpecification.findByIdForStore(id);
    return row ? new SalesChannelSpecificationResolver(row, this.$ctx) : null;
  }

  async salesChannelConnection(args: { id: string }) {
    const id = this.decodeId(
      args.id,
      GlobalIdEntity.SalesChannelConnection,
    );
    const row =
      await this.$ctx.repository.salesChannelConnection.findByIdForStore(id);
    return row ? new SalesChannelConnectionResolver(row, this.$ctx) : null;
  }

  salesChannelConnections(args: {
    first?: number;
    after?: string;
    last?: number;
    before?: string;
  }) {
    return new SalesChannelConnectionConnectionResolver(args, this.$ctx);
  }
}
