import { Injectable } from "@nestjs/common";
import type { Apps } from "@shopana/broker-types";
import type {
  AppInstallationStatus,
  AppLifecycleOperationType,
  AppManifest,
} from "@shopana/app-sdk";
import type {
  BrokerCallContext,
  ServiceBroker,
} from "@shopana/shared-kernel";
import { AppInstallationSecretStore } from "./AppInstallationSecretStore.js";
import {
  AppInstallationStore,
  type BegunLifecycleOperation,
} from "./AppInstallationStore.js";
import { snapshotManifest } from "./manifest.js";
import { AppRuntimeRegistry } from "../runtime/AppRuntimeRegistry.js";

@Injectable()
export class AppLifecycleService {
  constructor(
    private readonly installations: AppInstallationStore,
    private readonly secrets: AppInstallationSecretStore,
    private readonly runtimes: AppRuntimeRegistry,
  ) {}

  async install(
    params: Apps.InstallAppParams,
    context: BrokerCallContext,
    broker: ServiceBroker,
  ): Promise<Apps.AppLifecycleAcceptedResult> {
    this.assertPlatformCaller(context);
    const runtime = this.requireRuntime(params.appCode);
    const manifest = runtime.definition.manifest;
    const grantedScopes = this.validateGrantedScopes(
      manifest,
      params.grantedScopes ?? manifest.permissions,
    );
    const begun = await this.installations.beginInstall({
      appCode: manifest.code,
      organizationId: required(params.organizationId, "organizationId"),
      storeId: required(params.storeId, "storeId"),
      targetVersion: manifest.version,
      configuration: params.configuration ?? {},
      grantedScopes,
      snapshot: snapshotManifest(manifest),
      installedByUserId: params.installedByUserId,
      idempotencyKey: required(params.idempotencyKey, "idempotencyKey"),
      actor: params.system
        ? { type: "SYSTEM" }
        : actorFromContext(context, params.installedByUserId),
      correlationId: params.correlationId,
      workflowId: params.workflowId,
    });
    await this.persistSecrets(
      begun,
      params.secrets,
    );
    return this.startLifecycle(begun, broker);
  }

  async update(
    params: Apps.UpdateAppParams,
    context: BrokerCallContext,
    broker: ServiceBroker,
  ): Promise<Apps.AppLifecycleAcceptedResult> {
    this.assertPlatformCaller(context);
    const installation = await this.requireInstallation(
      params.installationId,
    );
    const runtime = this.requireRuntime(installation.appCode);
    const manifest = runtime.definition.manifest;
    const grantedScopes =
      params.grantedScopes === undefined
        ? undefined
        : this.validateGrantedScopes(manifest, params.grantedScopes);
    const begun = await this.installations.beginExistingOperation({
      installationId: installation.id,
      type: "UPDATE",
      expectedStatuses: [
        "ACTIVE",
        "SUSPENDED",
        "UPDATE_FAILED",
      ],
      transitionStatus: "UPDATING",
      targetVersion: manifest.version,
      idempotencyKey: required(params.idempotencyKey, "idempotencyKey"),
      actor: actorFromContext(context),
      correlationId: params.correlationId,
      configuration: params.configuration,
      expectedConfigurationVersion: params.expectedConfigurationVersion,
      grantedScopes,
      snapshot: snapshotManifest(manifest),
    });
    await this.persistSecrets(begun, params.secrets);
    return this.startLifecycle(begun, broker);
  }

  async suspend(
    params: Apps.SuspendAppParams,
    context: BrokerCallContext,
    broker: ServiceBroker,
  ): Promise<Apps.AppLifecycleAcceptedResult> {
    return this.beginSimpleOperation(
      params,
      context,
      broker,
      "SUSPEND",
      ["ACTIVE"],
      "SUSPENDING",
    );
  }

  async resume(
    params: Apps.ResumeAppParams,
    context: BrokerCallContext,
    broker: ServiceBroker,
  ): Promise<Apps.AppLifecycleAcceptedResult> {
    return this.beginSimpleOperation(
      params,
      context,
      broker,
      "RESUME",
      ["SUSPENDED"],
      "RESUMING",
    );
  }

  async uninstall(
    params: Apps.UninstallAppParams,
    context: BrokerCallContext,
    broker: ServiceBroker,
  ): Promise<Apps.AppLifecycleAcceptedResult> {
    const installation = await this.requireInstallation(
      params.installationId,
    );
    if (
      this.runtimes.isRequired(installation.appCode) &&
      params.system !== true
    ) {
      throw new Error(
        `Required App "${installation.appCode}" cannot be uninstalled manually`,
      );
    }
    return this.beginSimpleOperation(
      params,
      context,
      broker,
      "UNINSTALL",
      [
        "ACTIVE",
        "SUSPENDED",
        "INSTALL_FAILED",
        "UPDATE_FAILED",
        "UNINSTALL_FAILED",
      ],
      "UNINSTALLING",
    );
  }

  private async beginSimpleOperation(
    params:
      | Apps.SuspendAppParams
      | Apps.ResumeAppParams
      | Apps.UninstallAppParams,
    context: BrokerCallContext,
    broker: ServiceBroker,
    type: Exclude<AppLifecycleOperationType, "INSTALL" | "UPDATE">,
    expectedStatuses: readonly AppInstallationStatus[],
    transitionStatus: AppInstallationStatus,
  ): Promise<Apps.AppLifecycleAcceptedResult> {
    this.assertPlatformCaller(context);
    const installation = await this.requireInstallation(
      params.installationId,
    );
    const runtime = this.requireRuntime(installation.appCode);
    const begun = await this.installations.beginExistingOperation({
      installationId: installation.id,
      type,
      expectedStatuses,
      transitionStatus,
      targetVersion: runtime.definition.manifest.version,
      idempotencyKey: required(params.idempotencyKey, "idempotencyKey"),
      actor:
        "system" in params && params.system
          ? { type: "SYSTEM" }
          : actorFromContext(context),
      correlationId: params.correlationId,
      workflowId:
        "workflowId" in params ? params.workflowId : undefined,
    });
    return this.startLifecycle(begun, broker);
  }

  private async startLifecycle(
    begun: BegunLifecycleOperation,
    broker: ServiceBroker,
  ): Promise<Apps.AppLifecycleAcceptedResult> {
    if (!begun.duplicate) {
      try {
        await broker.startWorkflow(
          "apps.installationLifecycle",
          {
            installationId: begun.installation.id,
            operationId: begun.operation.id,
          },
          {
            source: "content",
            organizationId: begun.installation.organizationId,
            resourceId: begun.installation.id,
            operation: `apps.lifecycle.${begun.operation.type.toLowerCase()}:${begun.operation.targetVersion}`,
            content: {
              operationId: begun.operation.id,
              targetVersion: begun.operation.targetVersion,
            },
          },
          { workflowId: begun.operation.workflowId },
        );
      } catch (error) {
        await this.installations.failOperation(
          begun.operation.id,
          error,
        );
        throw error;
      }
    }
    const current =
      (await this.installations.findById(begun.installation.id)) ??
      begun.installation;
    return {
      installationId: begun.installation.id,
      operationId: begun.operation.id,
      workflowId: begun.operation.workflowId,
      status: current.status,
      duplicate: begun.duplicate,
    };
  }

  private async persistSecrets(
    begun: BegunLifecycleOperation,
    secrets: Readonly<Record<string, string>> | undefined,
  ): Promise<void> {
    if (begun.duplicate || !secrets) {
      return;
    }
    try {
      await this.secrets.setMany(begun.installation.id, secrets);
    } catch (error) {
      await this.installations.failOperation(
        begun.operation.id,
        error,
      );
      throw error;
    }
  }

  private requireRuntime(appCode: string) {
    const runtime = this.runtimes.get(required(appCode, "appCode"));
    if (!runtime || runtime.status !== "READY") {
      throw new Error(`App runtime "${appCode}" is not ready`);
    }
    return runtime;
  }

  private async requireInstallation(installationId: string) {
    const installation = await this.installations.findById(
      required(installationId, "installationId"),
    );
    if (!installation) {
      throw new Error(`App installation "${installationId}" not found`);
    }
    return installation;
  }

  private validateGrantedScopes(
    manifest: AppManifest,
    scopes: readonly string[],
  ): readonly string[] {
    const declared = new Set(manifest.permissions);
    const normalized = [...new Set(scopes)].sort();
    const unknown = normalized.filter((scope) => !declared.has(scope));
    if (unknown.length > 0) {
      throw new Error(
        `App "${manifest.code}" cannot receive undeclared scopes: ${unknown.join(", ")}`,
      );
    }
    return normalized;
  }

  private assertPlatformCaller(context: BrokerCallContext): void {
    if (context.caller.kind !== "action" || context.app) {
      throw new Error(
        "App lifecycle can only be initiated by a platform service",
      );
    }
  }
}

function required(value: string, field: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`${field} is required`);
  }
  return normalized;
}

function actorFromContext(
  context: BrokerCallContext,
  userId?: string,
): { readonly type: "USER" | "SERVICE"; readonly id: string } {
  return userId
    ? { type: "USER", id: userId }
    : { type: "SERVICE", id: context.caller.service };
}
