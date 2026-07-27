import { Inject, Injectable } from "@nestjs/common";
import type {
  AppInstallInput,
  AppResumeInput,
  AppSuspendInput,
  AppUninstallInput,
  AppUpdateInput,
} from "@shopana/app-sdk";
import {
  BrokerWorkflows,
  InjectBroker,
  Policy,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { AppInstallationStore } from "./AppInstallationStore.js";
import type { AppLifecycleWorkflowInput } from "./types.js";
import { AppRuntimeRegistry } from "../runtime/AppRuntimeRegistry.js";
import { AppsRuntimeRouter } from "../runtime/AppsRuntimeRouter.js";
import type { PreparedAppWorkflowInvocation } from "../runtime/AppsRuntimeRouter.js";

@Injectable()
export class AppInstallationLifecycleWorkflow extends BrokerWorkflows<
  AppLifecycleWorkflowInput,
  { installationId: string; status: string }
> {
  constructor(
    @InjectBroker("apps") broker: ServiceBroker,
    @Inject(AppInstallationStore)
    private readonly installations: AppInstallationStore,
    @Inject(AppRuntimeRegistry)
    private readonly runtimes: AppRuntimeRegistry,
    @Inject(AppsRuntimeRouter)
    private readonly router: AppsRuntimeRouter,
  ) {
    super(broker);
  }

  @Workflow("installationLifecycle", {
    idempotencyStrategy: "content",
  })
  @Policy<AppLifecycleWorkflowInput>({
    resource: "store.apps",
    action: (_self, input) =>
      input.operationType === "UNINSTALL" ? "admin" : "write",
    organizationId: (_self, input) => input.organizationId,
    domain: (_self, input) => `store:${input.storeId}`,
  })
  async run(
    input: AppLifecycleWorkflowInput,
  ): Promise<{ installationId: string; status: string }> {
    await this.markRunning(input.operationId);
    try {
      const childWorkflow = await this.dispatchAppLifecycle(input);
      if (childWorkflow) {
        await this.router.runPreparedWorkflow(childWorkflow);
      }
      const installation = await this.complete(input.operationId);
      return {
        installationId: installation.id,
        status: installation.status,
      };
    } catch (error) {
      await this.fail(input.operationId, error);
      throw error;
    }
  }

  @WorkflowStep()
  private markRunning(operationId: string): Promise<void> {
    return this.installations.markOperationRunning(operationId);
  }

  @WorkflowStep()
  private async dispatchAppLifecycle(
    input: AppLifecycleWorkflowInput,
  ): Promise<PreparedAppWorkflowInvocation | null> {
    const operation = await this.installations.findOperationById(
      input.operationId,
    );
    const installation = await this.installations.findById(
      input.installationId,
    );
    if (
      !operation ||
      !installation ||
      operation.installationId !== installation.id
    ) {
      throw new Error("App lifecycle workflow input is invalid");
    }
    const runtime = this.runtimes.get(installation.appCode);
    if (!runtime || runtime.status !== "READY") {
      throw new Error(
        `App runtime "${installation.appCode}" is not ready`,
      );
    }
    const manifest = runtime.definition.manifest;
    const contextRef = {
      installationId: installation.id,
      operationId: operation.id,
      correlationId: operation.correlationId ?? undefined,
    };
    const idempotency = {
      source: "content" as const,
      organizationId: installation.organizationId,
      resourceId: installation.id,
      operation: `apps.${installation.appCode}.${operation.type.toLowerCase()}:${operation.targetVersion}`,
      content: { operationId: operation.id },
    };

    switch (operation.type) {
      case "INSTALL": {
        const workflow = manifest.lifecycle.installWorkflow;
        if (workflow) {
          return this.router.prepareWorkflow<AppInstallInput>(
            manifest.code,
            workflow,
            {
              version: operation.targetVersion,
              configuration: installation.configuration,
            },
            contextRef,
            idempotency,
            { workflowId: `${operation.workflowId}:app` },
          );
        }
        return null;
      }
      case "UPDATE": {
        const workflow = manifest.lifecycle.updateWorkflow;
        if (workflow) {
          return this.router.prepareWorkflow<AppUpdateInput>(
            manifest.code,
            workflow,
            {
              previousVersion:
                installation.installedVersion ?? operation.targetVersion,
              targetVersion: operation.targetVersion,
              configuration: installation.configuration,
            },
            contextRef,
            idempotency,
            { workflowId: `${operation.workflowId}:app` },
          );
        }
        return null;
      }
      case "SUSPEND": {
        const action = manifest.lifecycle.suspendAction;
        if (action) {
          await this.router.invoke<void, AppSuspendInput>(
            manifest.code,
            action,
            { installationId: installation.id },
            contextRef,
          );
        }
        return null;
      }
      case "RESUME": {
        const action = manifest.lifecycle.resumeAction;
        if (action) {
          await this.router.invoke<void, AppResumeInput>(
            manifest.code,
            action,
            { installationId: installation.id },
            contextRef,
          );
        }
        return null;
      }
      case "UNINSTALL": {
        const workflow = manifest.lifecycle.uninstallWorkflow;
        if (workflow) {
          return this.router.prepareWorkflow<AppUninstallInput>(
            manifest.code,
            workflow,
            {
              version:
                installation.installedVersion ?? operation.targetVersion,
            },
            contextRef,
            idempotency,
            { workflowId: `${operation.workflowId}:app` },
          );
        }
        return null;
      }
    }
  }

  @WorkflowStep()
  private async complete(operationId: string) {
    const operation = await this.installations.findOperationById(operationId);
    if (!operation) {
      throw new Error(`Lifecycle operation "${operationId}" not found`);
    }
    const installation = await this.installations.findById(
      operation.installationId,
    );
    if (!installation) {
      throw new Error(
        `App installation "${operation.installationId}" not found`,
      );
    }
    const runtime = this.runtimes.get(installation.appCode);
    if (!runtime) {
      throw new Error(
        `App runtime "${installation.appCode}" is not registered`,
      );
    }
    return this.installations.completeOperation(
      operationId,
      runtime.definition.manifest,
    );
  }

  @WorkflowStep({ retriesAllowed: false })
  private fail(operationId: string, error: unknown): Promise<void> {
    return this.installations.failOperation(operationId, error);
  }
}
