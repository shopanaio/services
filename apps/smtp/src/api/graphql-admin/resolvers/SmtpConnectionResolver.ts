import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import type { SmtpConnectionRecord } from "../../../connections/index.js";
import { SmtpType } from "./SmtpType.js";

export class SmtpConnectionResolver extends SmtpType<
  string,
  SmtpConnectionRecord | null
> {
  protected $preload() {
    return this.$ctx.connections.findById(this.scope, this.$props);
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.SmtpConnection);
  }

  displayName() {
    return this.requiredData("displayName");
  }

  provider() {
    return this.requiredData("provider");
  }

  status() {
    return this.requiredData("status");
  }

  host() {
    return this.requiredData("host");
  }

  port() {
    return this.requiredData("port");
  }

  security() {
    return this.requiredData("security");
  }

  username() {
    return this.requiredData("username");
  }

  hasPassword() {
    return this.requiredData("hasPassword");
  }

  createdAt() {
    return this.requiredData("createdAt");
  }

  updatedAt() {
    return this.requiredData("updatedAt");
  }

  private async requiredData<TKey extends keyof SmtpConnectionRecord>(
    key: TKey,
  ): Promise<SmtpConnectionRecord[TKey]> {
    const data = await this.$data;
    if (!data) throw new Error("SMTP connection was not found");
    return data[key];
  }
}
