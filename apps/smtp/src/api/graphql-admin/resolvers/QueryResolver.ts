import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { SMTP_PROVIDER_PRESETS } from "../../../connections/index.js";
import { SmtpConnectionResolver } from "./SmtpConnectionResolver.js";
import { SmtpType } from "./SmtpType.js";

export class QueryResolver extends SmtpType<Record<string, never>> {
  smtpAppQuery() {
    return new SmtpAppQueryResolver({}, this.$ctx);
  }
}

export class SmtpAppQueryResolver extends SmtpType<Record<string, never>> {
  smtpProviderPresets() {
    return SMTP_PROVIDER_PRESETS;
  }

  async smtpConnections() {
    const connections = await this.$ctx.connections.list(this.scope);
    return connections.map(
      ({ id }) => new SmtpConnectionResolver(id, this.$ctx),
    );
  }

  async smtpConnection(args: { id: string }) {
    let connectionId: string;
    try {
      connectionId = this.decodeId(
        args.id,
        GlobalIdEntity.SmtpConnection,
      );
    } catch {
      return null;
    }
    const connection = await this.$ctx.connections.findById(
      this.scope,
      connectionId,
    );
    return connection
      ? new SmtpConnectionResolver(connectionId, this.$ctx)
      : null;
  }
}
