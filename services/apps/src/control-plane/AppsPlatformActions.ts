import { Injectable } from "@nestjs/common";
import type { Apps } from "@shopana/broker-types";
import {
  Action,
  BrokerActions,
  InjectBroker,
  ServiceBroker,
  type BrokerCallContext,
} from "@shopana/shared-kernel";
import { AppInstallationRepository } from "../repositories/installation/AppInstallationRepository.js";
import { AppLifecycleService } from "./AppLifecycleService.js";
import { AppsRuntimeRouter } from "../runtime/AppsRuntimeRouter.js";

@Injectable()
export class AppsPlatformActions extends BrokerActions {
  constructor(
    @InjectBroker("apps") broker: ServiceBroker,
    private readonly lifecycle: AppLifecycleService,
    private readonly installations: AppInstallationRepository,
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
    const route = await this.installations.resolveCapabilityRoute(
      params.storeId,
      params.capability,
      params.operation,
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
}
