import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference, TypePolicy } from "@shopana/type-resolver";
import type { AppInstallationRecord } from "../../control-plane/types.js";
import type {
  AppInstallationLifecycleOperationsArgs,
  AppInstallationManifestSnapshotsArgs,
} from "./generated/types.js";
import { AppsType } from "./AppsType.js";

@SubgraphReference()
@TypePolicy<AppInstallationResolver>({
  resource: "store.apps",
  action: "read",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
  onDeny: "null",
})
export class AppInstallationResolver extends AppsType<string, AppInstallationRecord> {
  async $preload(): Promise<AppInstallationRecord> {
    const installation = await this.$ctx.loaders.installation.load(this.$props);
    if (!installation) {
      throw new PreloadNotFoundError(`App installation "${this.$props}" not found`);
    }
    return installation;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.AppInstallation);
  }

  appCode() {
    return this.$get("appCode");
  }

  status() {
    return this.$get("status");
  }

  installedVersion() {
    return this.$get("installedVersion");
  }

  targetVersion() {
    return this.$get("targetVersion");
  }

  manifestHash() {
    return this.$get("manifestHash");
  }

  configuration() {
    return this.$get("configuration");
  }

  healthStatus() {
    return this.$get("healthStatus");
  }

  async lastError() {
    const [code, message] = await Promise.all([
      this.$get("lastErrorCode"),
      this.$get("lastErrorMessage"),
    ]);
    return message === null
      ? null
      : {
          code: code ?? "APP_ERROR",
          message,
        };
  }

  async installedByUserId() {
    const userId = await this.$get("installedByUserId");
    return userId ? this.encodeId(userId, GlobalIdEntity.User) : null;
  }

  async scopes() {
    const scopes = await this.$ctx.loaders.scopesByInstallation.load(this.$props);
    return scopes.map((scope) => ({
      scope: scope.scope,
      grantedAt: scope.grantedAt,
      revokedAt: scope.revokedAt,
      granted: scope.revokedAt === null,
    }));
  }

  async capabilities() {
    const bindings = await this.$ctx.loaders.capabilityBindingsByInstallation.load(this.$props);
    return Promise.all(bindings.map((binding) => this.resolvers.appCapabilityBinding(binding.id)));
  }

  lifecycleOperations(args: AppInstallationLifecycleOperationsArgs) {
    return this.resolvers.appLifecycleOperationConnection(this.$props, args);
  }

  manifestSnapshots(args: AppInstallationManifestSnapshotsArgs) {
    return this.resolvers.appManifestSnapshotConnection(this.$props, args);
  }

  installedAt() {
    return this.$get("installedAt");
  }

  suspendedAt() {
    return this.$get("suspendedAt");
  }

  uninstalledAt() {
    return this.$get("uninstalledAt");
  }

  createdAt() {
    return this.$get("createdAt");
  }

  updatedAt() {
    return this.$get("updatedAt");
  }
}
