import { TypePolicy } from "@shopana/type-resolver";
import type { AppManifestSnapshotConnectionInput } from "../../repositories/manifest/AppManifestSnapshotRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export interface AppManifestSnapshotConnectionResolverInput {
  readonly installationId: string;
  readonly input: AppManifestSnapshotConnectionInput;
}

@TypePolicy<AppManifestSnapshotConnectionResolver>({
  resource: "store.apps",
  action: "read",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
})
export class AppManifestSnapshotConnectionResolver extends BaseConnectionResolver<AppManifestSnapshotConnectionResolverInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.repository.manifestSnapshot.getConnection(
      this.$props.installationId,
      this.$props.input,
    );
  }

  createNodeResolver(nodeId: string) {
    return this.resolvers.appManifestSnapshot(nodeId);
  }
}
