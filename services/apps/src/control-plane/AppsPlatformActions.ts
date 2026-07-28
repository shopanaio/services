import { Inject, Injectable } from "@nestjs/common";
import type { Apps } from "@shopana/broker-types";
import {
  Action,
  BrokerActions,
  InjectBroker,
  ServiceBroker,
  type BrokerCallContext,
} from "@shopana/shared-kernel";
import { AppInstallationStore } from "./AppInstallationStore.js";
import { AppLifecycleService } from "./AppLifecycleService.js";
import { AppsRuntimeRouter } from "../runtime/AppsRuntimeRouter.js";

@Injectable()
export class AppsPlatformActions extends BrokerActions {
  constructor(
    @InjectBroker("apps") broker: ServiceBroker,
    @Inject(AppLifecycleService)
    private readonly lifecycle: AppLifecycleService,
    @Inject(AppInstallationStore)
    private readonly installations: AppInstallationStore,
    @Inject(AppsRuntimeRouter)
    private readonly router: AppsRuntimeRouter,
  ) {
    super(broker);
  }

  @Action("installApp")
  installApp(
    params: Apps.InstallAppParams,
    context: BrokerCallContext,
  ): Promise<Apps.AppLifecycleAcceptedResult> {
    return this.lifecycle.install(params, context, this.broker);
  }

  @Action("updateApp")
  updateApp(
    params: Apps.UpdateAppParams,
    context: BrokerCallContext,
  ): Promise<Apps.AppLifecycleAcceptedResult> {
    return this.lifecycle.update(params, context, this.broker);
  }

  @Action("suspendApp")
  suspendApp(
    params: Apps.SuspendAppParams,
    context: BrokerCallContext,
  ): Promise<Apps.AppLifecycleAcceptedResult> {
    return this.lifecycle.suspend(params, context, this.broker);
  }

  @Action("resumeApp")
  resumeApp(
    params: Apps.ResumeAppParams,
    context: BrokerCallContext,
  ): Promise<Apps.AppLifecycleAcceptedResult> {
    return this.lifecycle.resume(params, context, this.broker);
  }

  @Action("uninstallApp")
  uninstallApp(
    params: Apps.UninstallAppParams,
    context: BrokerCallContext,
  ): Promise<Apps.AppLifecycleAcceptedResult> {
    return this.lifecycle.uninstall(params, context, this.broker);
  }

  @Action("executeCapability")
  async executeCapability(
    params: Apps.ExecuteCapabilityParams,
    context: BrokerCallContext,
  ): Promise<Apps.ExecuteCapabilityResult> {
    if (
      context.caller.kind !== "action" ||
      context.app ||
      !params.storeId?.trim() ||
      !params.capability?.trim() ||
      !params.operation?.trim()
    ) {
      throw new Error("Invalid capability invocation");
    }
    const route = params.installationId
      ? await this.installations.resolveActiveStoreCapabilityRouteForInstallation(
          params.storeId,
          params.capability,
          params.operation,
          params.installationId,
        )
      : await this.installations.resolveCapabilityRoute(
          params.storeId,
          params.capability,
          params.operation,
          params.target ? normalizeTarget(params.target) : undefined,
        );
    if (!route) {
      throw new Error(
        `No active App route for capability "${params.capability}.${params.operation}"`,
      );
    }
    const data = await this.router.invoke(
      route.appCode,
      route.targetAction,
      params.input,
      {
        installationId: route.installationId,
        correlationId: params.correlationId,
      },
    );
    return {
      installationId: route.installationId,
      appCode: route.appCode,
      data,
    };
  }

  @Action("listCapabilityRoutes")
  async listCapabilityRoutes(
    params: Apps.ListCapabilityRoutesParams,
    context: BrokerCallContext,
  ): Promise<Apps.ListCapabilityRoutesResult> {
    if (
      context.caller.kind !== "action" ||
      context.app ||
      !params.storeId?.trim() ||
      !params.capability?.trim() ||
      !params.operation?.trim()
    ) {
      throw new Error("Invalid capability route query");
    }
    const routes =
      await this.installations.listActiveStoreCapabilityRoutes(
        params.storeId,
        params.capability,
        params.operation,
      );
    return {
      routes: routes.map(({ installationId, appCode }) => ({
        installationId,
        appCode,
      })),
    };
  }

  @Action("assignCapability")
  async assignCapability(
    params: Apps.AssignCapabilityParams,
    context: BrokerCallContext,
  ): Promise<Apps.AssignCapabilityResult> {
    assertPlatformCaller(context);
    const target = normalizeTarget(params.target);
    const assignmentIds =
      await this.installations.assignCapabilityResource({
        storeId: required(params.storeId, "storeId"),
        installationId: required(
          params.installationId,
          "installationId",
        ),
        capability: required(params.capability, "capability"),
        target,
        precedence: params.precedence ?? 0,
      });
    return { assignmentIds };
  }

  @Action("unassignCapability")
  async unassignCapability(
    params: Apps.UnassignCapabilityParams,
    context: BrokerCallContext,
  ): Promise<Apps.UnassignCapabilityResult> {
    assertPlatformCaller(context);
    const removed =
      await this.installations.unassignCapabilityResource({
        storeId: required(params.storeId, "storeId"),
        installationId: required(
          params.installationId,
          "installationId",
        ),
        capability: required(params.capability, "capability"),
        target: normalizeTarget(params.target),
      });
    return { removed };
  }
}

function assertPlatformCaller(context: BrokerCallContext): void {
  if (context.caller.kind !== "action" || context.app) {
    throw new Error("Capability assignments require a platform caller");
  }
}

function normalizeTarget(target: Apps.CapabilityTarget) {
  return {
    aggregate: required(target?.aggregate, "target.aggregate"),
    aggregateId: required(target?.aggregateId, "target.aggregateId"),
    domain: required(target?.domain, "target.domain"),
  };
}

function required(value: string | undefined, field: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`${field} is required`);
  }
  return normalized;
}
