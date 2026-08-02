import { Inject, Injectable } from "@nestjs/common";
import {
  COMMERCE_FUNCTION_CAPABILITY,
  COMMERCE_FUNCTION_MAX_ENVELOPE_DEPTH,
  COMMERCE_FUNCTION_MAX_INVOCATION_BYTES,
  COMMERCE_FUNCTION_MAX_OUTPUT_BYTES,
  canonicalizeCommerceFunctionJson,
  type Apps,
  type CommerceFunctionInvocation,
  type CommerceFunctionJsonValue,
} from "@shopana/broker-types";
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
import {
  CapabilityInvocationError,
  CommerceFunctionOutputError,
} from "./capability-error-classification.js";
import type { ResolvedCapabilityRoute } from "./types.js";

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
    const functionInvocation =
      params.capability === COMMERCE_FUNCTION_CAPABILITY
        ? createCommerceFunctionInvocation(params)
        : undefined;
    let route: ResolvedCapabilityRoute | null;
    try {
      route = params.installationId
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
    } catch (error) {
      if (params.capability === COMMERCE_FUNCTION_CAPABILITY) {
        throw new CapabilityInvocationError(
          error,
          undefined,
          {
            classification: "ROUTE_UNAVAILABLE",
            code: "FUNCTION_ROUTE_DISCOVERY_FAILED",
          },
        );
      }
      throw error;
    }
    if (!route) {
      if (params.capability === COMMERCE_FUNCTION_CAPABILITY) {
        throw new CapabilityInvocationError(
          undefined,
          undefined,
          {
            classification: "ROUTE_UNAVAILABLE",
            code: "FUNCTION_ROUTE_UNAVAILABLE",
          },
        );
      }
      throw new Error(
        `No active App route for capability "${params.capability}.${params.operation}"`,
      );
    }
    if (
      params.capability === COMMERCE_FUNCTION_CAPABILITY &&
      route.targetAction !== params.functionKey
    ) {
      throw new CapabilityInvocationError(
        undefined,
        route,
        {
          classification: "ROUTE_UNAVAILABLE",
          code: "FUNCTION_KEY_MISMATCH",
        },
      );
    }
    if (params.capability === COMMERCE_FUNCTION_CAPABILITY) {
      assertCommerceFunctionDeadline(params.deadlineAt);
    }
    const input = functionInvocation ?? params.input;
    let data: unknown;
    try {
      data = await this.router.invoke(
        route.appCode,
        route.targetAction,
        input,
        {
          installationId: route.installationId,
          correlationId: params.correlationId,
          executionKind:
            params.capability === COMMERCE_FUNCTION_CAPABILITY
              ? "COMMERCE_FUNCTION"
              : "STANDARD",
        },
      );
      if (params.capability === COMMERCE_FUNCTION_CAPABILITY) {
        data = normalizeCommerceFunctionOutput(data);
      }
    } catch (error) {
      if (params.capability === COMMERCE_FUNCTION_CAPABILITY) {
        throw new CapabilityInvocationError(error, route);
      }
      throw error;
    }
    return {
      capabilityRouteId: route.capabilityRouteId,
      installationId: route.installationId,
      appCode: route.appCode,
      appVersion: route.appVersion,
      routeRevision: route.routeRevision,
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
      routes: routes.map(({
        capabilityRouteId,
        installationId,
        appCode,
        appVersion,
        targetAction,
        routeRevision,
      }) => ({
        capabilityRouteId,
        installationId,
        appCode,
        appVersion,
        functionKey: targetAction,
        routeRevision,
      })),
    };
  }

  @Action("listCommerceFunctionBindings")
  async listCommerceFunctionBindings(
    params: Apps.ListCommerceFunctionBindingsParams,
    context: BrokerCallContext,
  ): Promise<Apps.ListCommerceFunctionBindingsResult> {
    if (
      context.caller.kind !== "action" ||
      context.app ||
      !params.storeId?.trim() ||
      !params.target?.trim()
    ) {
      throw new Error("Invalid Commerce Function binding query");
    }
    const routes = await this.installations.listActiveStoreCapabilityRoutes(
      params.storeId,
      COMMERCE_FUNCTION_CAPABILITY,
      params.target,
    );
    return {
      bindings: routes.map((route, activationSequence) => ({
        functionBindingId: route.capabilityRouteId,
        storeId: params.storeId,
        target: params.target,
        installationId: route.installationId,
        functionKey: route.targetAction,
        owner: {
          service: context.caller.service,
          resourceType: "store",
          resourceId: params.storeId,
        },
        status: "ACTIVE",
        failureMode: "REQUIRED",
        configurationSnapshot: null,
        configurationRevision: route.routeRevision,
        routeRevision: route.routeRevision,
        precedence: 0,
        activationSequence,
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

function createCommerceFunctionInvocation(
  params: Apps.ExecuteCapabilityParams,
): Readonly<CommerceFunctionInvocation> {
  required(params.installationId, "installationId");
  required(params.functionKey, "functionKey");
  const executionId = required(params.executionId, "executionId");
  const functionBindingId = required(
    params.functionBindingId,
    "functionBindingId",
  );
  const deadlineAt = assertCommerceFunctionDeadline(params.deadlineAt);
  const invocation = canonicalizeCommerceFunctionJson(
    {
      target: required(params.operation, "operation"),
      executionId,
      functionBindingId,
      deadlineAt,
      ...(params.correlationId
        ? { correlationId: params.correlationId }
        : {}),
      configurationSnapshot: params.configurationSnapshot ?? null,
      input: params.input ?? null,
    },
    COMMERCE_FUNCTION_MAX_ENVELOPE_DEPTH,
  );
  if (
    Buffer.byteLength(JSON.stringify(invocation), "utf8") >
    COMMERCE_FUNCTION_MAX_INVOCATION_BYTES
  ) {
    throw new Error("Commerce Function invocation exceeds the size limit");
  }
  return invocation as unknown as Readonly<CommerceFunctionInvocation>;
}

function assertCommerceFunctionDeadline(
  value: string | undefined,
): string {
  const deadlineAt = required(value, "deadlineAt");
  const deadline = Date.parse(deadlineAt);
  if (!Number.isFinite(deadline)) {
    throw new Error("deadlineAt must be an ISO date");
  }
  if (deadline <= Date.now()) {
    throw new CapabilityInvocationError(
      undefined,
      undefined,
      {
        classification: "DEADLINE_EXCEEDED",
        code: "FUNCTION_DEADLINE_EXCEEDED",
      },
    );
  }
  return deadlineAt;
}

function normalizeCommerceFunctionOutput(
  value: unknown,
): CommerceFunctionJsonValue {
  let output: CommerceFunctionJsonValue;
  try {
    output = canonicalizeCommerceFunctionJson(
      value,
      COMMERCE_FUNCTION_MAX_ENVELOPE_DEPTH,
    );
  } catch (error) {
    throw new CommerceFunctionOutputError(
      "FUNCTION_OUTPUT_JSON_VALUE_REQUIRED",
      error,
    );
  }
  if (
    Buffer.byteLength(JSON.stringify(output), "utf8") >
    COMMERCE_FUNCTION_MAX_OUTPUT_BYTES
  ) {
    throw new CommerceFunctionOutputError(
      "FUNCTION_OUTPUT_SIZE_LIMIT",
    );
  }
  return output;
}
