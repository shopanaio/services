import { Injectable } from "@nestjs/common";
import { InjectBroker, type ServiceBroker } from "@shopana/shared-kernel";
import { Repository } from "../../repositories/Repository.js";
import { AppRuntimeRegistry } from "../../runtime/AppRuntimeRegistry.js";
import { restrictGrantedScopes } from "../../runtime/AppManifestContracts.js";

export type SalesChannelContract =
  | "connect"
  | "update"
  | "disconnect"
  | "suspend"
  | "resume"
  | "health";

@Injectable()
export class SalesChannelRuntimeRouter {
  constructor(
    @InjectBroker("apps") private readonly broker: ServiceBroker,
    private readonly repository: Repository,
    private readonly runtimes: AppRuntimeRegistry,
  ) {}

  async invokeForConnection<TResult = unknown, TInput = unknown>(
    connectionId: string,
    contract: SalesChannelContract,
    input: TInput,
    options?: {
      readonly operationId?: string;
      readonly correlationId?: string;
      readonly allowTransitional?: boolean;
      readonly targetSpecificationId?: string;
    },
  ): Promise<TResult> {
    const connection =
      await this.repository.salesChannelConnection.findById(connectionId);
    if (!connection) throw new Error("Sales channel connection not found");
    const allowedStatuses = options?.allowTransitional
      ? [
          "CONNECTING",
          "UPDATING",
          "SUSPENDING",
          "RESUMING",
          "DISCONNECTING",
        ]
      : ["ACTIVE"];
    if (!allowedStatuses.includes(connection.status)) {
      throw new Error(
        `Sales channel connection is unavailable in status "${connection.status}"`,
      );
    }
    const installation =
      await this.repository.installation.findById(connection.installationId);
    if (
      !installation ||
      (installation.status !== "ACTIVE" &&
        !(contract === "update" &&
          installation.status === "UPDATING") &&
        !(contract === "disconnect" &&
          installation.status === "UNINSTALLING"))
    ) {
      throw new Error("Sales channel App installation is not active");
    }
    const specification =
      await this.repository.salesChannelSpecification.findById(
        options?.targetSpecificationId ??
          connection.specificationSnapshotId,
      );
    if (
      !specification ||
      specification.installationId !== installation.id ||
      specification.appCode !== installation.appCode
    ) {
      throw new Error("Sales channel specification ownership mismatch");
    }
    const operations = specification.definition.operations;
    if (!operations || typeof operations !== "object") {
      throw new Error("Sales channel specification has no operations");
    }
    const action = (operations as Record<string, unknown>)[contract];
    if (typeof action !== "string" || !action) {
      throw new Error(
        `Sales channel contract "${contract}" is not declared`,
      );
    }
    const runtime = this.runtimes.get(installation.appCode);
    if (!runtime || runtime.status !== "READY") {
      throw new Error(`App runtime "${installation.appCode}" is not ready`);
    }
    const expectedRuntimeVersion =
      installation.status === "UPDATING"
        ? installation.targetVersion
        : installation.installedVersion;
    if (runtime.definition.manifest.version !== expectedRuntimeVersion) {
      throw new Error("App runtime version does not match installation");
    }
    const operation = options?.operationId
      ? await this.repository.salesChannelOperation.findById(
          options.operationId,
        )
      : null;
    if (
      options?.operationId &&
      (!operation ||
        operation.connectionId !== connection.id ||
        (operation.status !== "PENDING" && operation.status !== "RUNNING"))
    ) {
      throw new Error("Sales channel operation context is invalid");
    }
    const grantedScopes = await this.repository.scope.listGranted(
      installation.id,
    );
    const baseContext = Object.freeze({
      appCode: installation.appCode,
      installationId: installation.id,
      organizationId: installation.organizationId,
      storeId: installation.storeId,
      appVersion: runtime.definition.manifest.version,
      grantedScopes,
      actor: operation
        ? {
            type: operation.actorType,
            ...(operation.actorId ? { id: operation.actorId } : {}),
          }
        : ({ type: "SYSTEM" } as const),
      correlationId: operation?.correlationId ?? undefined,
    });
    return this.broker.callAsApp<TResult, TInput>(
      `apps.${installation.appCode}.${action}`,
      input,
      Object.freeze({
        ...baseContext,
        operationId: options?.operationId,
        correlationId: options?.correlationId ?? baseContext.correlationId,
        grantedScopes: restrictGrantedScopes(
          runtime.definition.manifest,
          baseContext.grantedScopes,
        ),
        extension: {
          kind: "sales-channel" as const,
          instanceId: connection.id,
          specificationHandle: specification.handle,
        },
      }),
    );
  }
}
