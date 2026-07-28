import { TypePolicy } from "@shopana/type-resolver";
import type { AppConnectionInput } from "../../repositories/app/AppRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

@TypePolicy<AppConnectionResolver>({
  resource: "store.apps",
  action: "read",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
})
export class AppConnectionResolver extends BaseConnectionResolver<AppConnectionInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.repository.app.getConnection(
      this.$props,
      this.$ctx.runtimes.list().map(({ definition }) => definition),
    );
  }

  createNodeResolver(appCode: string) {
    return this.resolvers.appDefinition(appCode);
  }
}
