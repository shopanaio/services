import { TypePolicy } from "@shopana/type-resolver";
import type { AppLifecycleOperationConnectionInput } from "../../repositories/lifecycle/AppLifecycleOperationRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export interface AppLifecycleOperationConnectionResolverInput {
  readonly installationId: string;
  readonly input: AppLifecycleOperationConnectionInput;
}

@TypePolicy<AppLifecycleOperationConnectionResolver>({
  resource: "store.apps",
  action: "read",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
})
export class AppLifecycleOperationConnectionResolver extends BaseConnectionResolver<AppLifecycleOperationConnectionResolverInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.repository.lifecycleOperation.getConnection(
      this.$props.installationId,
      this.$props.input,
    );
  }

  createNodeResolver(nodeId: string) {
    return this.resolvers.appLifecycleOperation(nodeId);
  }
}
