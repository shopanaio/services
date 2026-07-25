import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import {
  HEADLESS_STOREFRONT_PERMISSION_CATALOG,
} from "../../../../app.manifest.js";
import { HeadlessType } from "./HeadlessType.js";
import { HeadlessStorefrontConnectionResolver } from "./HeadlessStorefrontConnectionResolver.js";

export class QueryResolver extends HeadlessType<Record<string, never>> {
  headlessAppQuery() {
    return new HeadlessAppQueryResolver({}, this.$ctx);
  }
}

export class HeadlessAppQueryResolver extends HeadlessType<
  Record<string, never>
> {
  headlessStorefrontPermissionCatalog() {
    return HEADLESS_STOREFRONT_PERMISSION_CATALOG;
  }

  async headlessStorefrontConnections() {
    const connections = await this.$ctx.repository.connection.list(
      this.scope,
    );
    return connections.map(
      ({ id }) =>
        new HeadlessStorefrontConnectionResolver(id, this.$ctx),
    );
  }

  async headlessStorefrontConnection(args: { id: string }) {
    let connectionId: string;
    try {
      connectionId = this.decodeId(
        args.id,
        GlobalIdEntity.HeadlessStorefrontConnection,
      );
    } catch {
      return null;
    }
    const connection =
      await this.$ctx.repository.connection.findById(
        this.scope,
        connectionId,
      );
    return connection
      ? new HeadlessStorefrontConnectionResolver(
          connection.id,
          this.$ctx,
        )
      : null;
  }
}
