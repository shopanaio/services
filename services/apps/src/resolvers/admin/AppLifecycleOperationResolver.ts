import {
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import {
  PreloadNotFoundError,
  SubgraphReference,
  TypePolicy,
} from "@shopana/type-resolver";
import type { AppLifecycleOperationRecord } from "../../control-plane/types.js";
import { AppsType } from "./AppsType.js";

@SubgraphReference()
@TypePolicy<AppLifecycleOperationResolver>({
  resource: "store.apps",
  action: "read",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
  onDeny: "null",
})
export class AppLifecycleOperationResolver extends AppsType<
  string,
  AppLifecycleOperationRecord
> {
  async $preload(): Promise<AppLifecycleOperationRecord> {
    const operation =
      await this.$ctx.loaders.lifecycleOperation.load(this.$props);
    if (!operation) {
      throw new PreloadNotFoundError(
        `App lifecycle operation "${this.$props}" not found`,
      );
    }
    return operation;
  }

  id() {
    return this.encodeId(
      this.$props,
      GlobalIdEntity.AppLifecycleOperation,
    );
  }

  async installation() {
    const installationId = await this.$get("installationId");
    return this.resolvers.appInstallation(installationId);
  }

  type() {
    return this.$get("type");
  }

  status() {
    return this.$get("status");
  }

  targetVersion() {
    return this.$get("targetVersion");
  }

  previousInstallationStatus() {
    return this.$get("previousInstallationStatus");
  }

  workflowId() {
    return this.$get("workflowId");
  }

  actorType() {
    return this.$get("actorType");
  }

  actorId() {
    return this.$get("actorId");
  }

  correlationId() {
    return this.$get("correlationId");
  }

  async error() {
    const [code, message] = await Promise.all([
      this.$get("errorCode"),
      this.$get("errorMessage"),
    ]);
    return message === null
      ? null
      : {
          code: code ?? "APP_LIFECYCLE_ERROR",
          message,
        };
  }

  startedAt() {
    return this.$get("startedAt");
  }

  completedAt() {
    return this.$get("completedAt");
  }

  createdAt() {
    return this.$get("createdAt");
  }

  updatedAt() {
    return this.$get("updatedAt");
  }
}
