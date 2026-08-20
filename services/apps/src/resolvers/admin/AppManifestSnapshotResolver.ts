import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference, TypePolicy } from "@shopana/type-resolver";
import type { AppManifestSnapshotRecord } from "../../repositories/manifest/AppManifestSnapshotRepository.js";
import { AppsType } from "./AppsType.js";

@SubgraphReference()
@TypePolicy<AppManifestSnapshotResolver>({
  resource: "store.apps",
  action: "read",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
  onDeny: "null",
})
export class AppManifestSnapshotResolver extends AppsType<string, AppManifestSnapshotRecord> {
  async $preload(): Promise<AppManifestSnapshotRecord> {
    const snapshot = await this.$ctx.loaders.manifestSnapshot.load(this.$props);
    if (!snapshot) {
      throw new PreloadNotFoundError(`App manifest snapshot "${this.$props}" not found`);
    }
    return snapshot;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.AppManifestSnapshot);
  }

  appCode() {
    return this.$get("appCode");
  }

  version() {
    return this.$get("version");
  }

  manifestHash() {
    return this.$get("manifestHash");
  }

  manifest() {
    return this.$get("manifest");
  }

  createdAt() {
    return this.$get("createdAt");
  }
}
