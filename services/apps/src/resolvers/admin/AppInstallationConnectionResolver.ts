import { TypePolicy } from "@shopana/type-resolver";
import type { AppInstallationConnectionInput } from "../../repositories/installation/AppInstallationRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

@TypePolicy<AppInstallationConnectionResolver>({
  resource: "store.apps",
  action: "read",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
})
export class AppInstallationConnectionResolver extends BaseConnectionResolver<AppInstallationConnectionInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.repository.installation.getConnection(this.$props);
  }

  createNodeResolver(nodeId: string) {
    return this.resolvers.appInstallation(nodeId);
  }
}
