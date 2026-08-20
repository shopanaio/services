import type { Apps } from "@shopana/broker-types";
import { COMMERCE_FUNCTION_CAPABILITY } from "@shopana/broker-types";
import type { ServiceBroker } from "@shopana/shared-kernel";
import type {
  AppExecutionPlanItem,
  CommerceFunctionBindingRef,
  CommerceFunctionExecutionPlan,
  CommerceFunctionRunRequest,
  FunctionExecutionPlanItem,
  FunctionTargetDefinition,
  NativeExecutionPlanItem,
} from "./contracts.js";
import {
  compareExecutionPlanItems,
  DEFAULT_MAX_ENVELOPE_DEPTH,
  effectiveDeadline,
  resolveFailureMode,
} from "./execution-policy.js";
import { canonicalizeEnvelope, cloneAndFreeze, envelopeDigest, planRevision } from "./trace.js";

export class FunctionRouteResolver {
  constructor(private readonly broker: ServiceBroker) {}

  async resolve<TInput>(
    request: CommerceFunctionRunRequest<TInput>,
    definition: FunctionTargetDefinition,
    nowMs = Date.now(),
  ): Promise<CommerceFunctionExecutionPlan> {
    assertBindings(request.bindings, request.storeId);
    const deadlineAt = effectiveDeadline(request.deadlineAt, definition.defaultTimeoutMs, nowMs);
    const discovery = await this.listRoutes(request, request.bindings.length > 0, deadlineAt);
    const routeByInstallation = new Map(
      discovery.routes.map((route) => [route.installationId, route]),
    );
    const items: FunctionExecutionPlanItem[] = [
      ...nativeItems(definition),
      ...request.bindings.map((binding) =>
        appItem(
          binding,
          routeByInstallation.get(binding.installationId),
          definition,
          discovery.failureCode,
        ),
      ),
    ]
      .filter((item) => item.failureMode !== "DISABLED")
      .sort(compareExecutionPlanItems);

    const activeAppCount = items.filter((item) => item.implementationType === "APP").length;
    if (
      activeAppCount > 1 &&
      (definition.executionMode === "SINGLE" || !definition.allowMultipleAppImplementations)
    ) {
      throw new Error(`Target "${definition.target}" does not allow multiple App implementations`);
    }

    const selected = selectPlanItems(items, definition.executionMode);
    const revision = planRevision({
      target: request.target,
      storeId: request.storeId,
      owningService: definition.owningService,
      executionId: request.executionId,
      bindingSetRevision: request.bindingSetRevision,
      deadlineAt,
      mode: definition.executionMode,
      items: selected.map(revisionItem),
    });
    return cloneAndFreeze({
      revision,
      target: request.target,
      storeId: request.storeId,
      owningService: definition.owningService,
      executionId: request.executionId,
      correlationId: request.correlationId,
      bindingSetRevision: request.bindingSetRevision,
      deadlineAt,
      mode: definition.executionMode,
      items: selected,
    });
  }

  private async listRoutes<TInput>(
    request: CommerceFunctionRunRequest<TInput>,
    required: boolean,
    deadlineAt: string,
  ): Promise<RouteDiscoveryResult> {
    if (!required) return { routes: [] };
    try {
      const result = await settleByDeadline(
        this.broker.call<Apps.ListCapabilityRoutesResult, Apps.ListCapabilityRoutesParams>(
          "apps.listCapabilityRoutes",
          {
            storeId: request.storeId,
            capability: COMMERCE_FUNCTION_CAPABILITY,
            operation: request.target,
          },
        ),
        deadlineAt,
      );
      return { routes: result.routes };
    } catch (error) {
      return {
        routes: [],
        failureCode:
          error instanceof DiscoveryDeadlineExceededError
            ? "DISCOVERY_DEADLINE_EXCEEDED"
            : "ROUTE_DISCOVERY_FAILED",
      };
    }
  }
}

function selectPlanItems(
  items: readonly FunctionExecutionPlanItem[],
  mode: FunctionTargetDefinition["executionMode"],
): readonly FunctionExecutionPlanItem[] {
  if (mode === "COLLECT_ALL") return items;
  const app = items.find((item) => item.implementationType === "APP");
  if (app) return [app];
  const native = items.find((item) => item.implementationType === "NATIVE");
  return native ? [native] : [];
}

interface RouteDiscoveryResult {
  readonly routes: readonly Apps.CapabilityRoute[];
  readonly failureCode?: "ROUTE_DISCOVERY_FAILED" | "DISCOVERY_DEADLINE_EXCEEDED";
}

function nativeItems(definition: FunctionTargetDefinition): NativeExecutionPlanItem[] {
  return (definition.nativeImplementations ?? []).map((implementation, index) => ({
    implementationType: "NATIVE",
    implementationId: implementation.implementationId,
    nativeAction: implementation.action,
    functionBindingId: null,
    owner: {
      service: definition.owningService,
      resourceType: "functionTarget",
      resourceId: definition.target,
    },
    configurationRevision: null,
    configurationSnapshot: null,
    precedence: implementation.precedence ?? -1_000_000,
    activationSequence: implementation.activationSequence ?? index,
    failureMode: resolveFailureMode(implementation.failureMode, "REQUIRED"),
  }));
}

function appItem(
  binding: CommerceFunctionBindingRef,
  route: Apps.CapabilityRoute | undefined,
  definition: FunctionTargetDefinition,
  discoveryFailureCode: RouteDiscoveryResult["failureCode"],
): AppExecutionPlanItem {
  const functionKeyMatches = route !== undefined && route.functionKey === binding.functionKey;
  const revisionMatches =
    route !== undefined && functionKeyMatches && route.routeRevision === binding.routeRevision;
  const configurationSnapshot = canonicalizeEnvelope(
    binding.configurationSnapshot ?? null,
    definition.maxEnvelopeDepth ?? DEFAULT_MAX_ENVELOPE_DEPTH,
    "input",
  );
  const configurationSnapshotDigest = envelopeDigest(
    configurationSnapshot,
    definition.maxInputBytes,
    definition.maxEnvelopeDepth ?? DEFAULT_MAX_ENVELOPE_DEPTH,
    "input",
  ).digest;
  return {
    implementationType: "APP",
    implementationId: `app:${binding.functionBindingId}`,
    functionBindingId: binding.functionBindingId,
    functionKey: binding.functionKey,
    owner: cloneAndFreeze(binding.owner),
    configurationRevision: binding.configurationRevision,
    configurationSnapshot,
    configurationSnapshotDigest,
    precedence: binding.precedence,
    activationSequence: binding.activationSequence,
    failureMode: resolveFailureMode(binding.failureMode, definition.appFailureMode),
    installationId: binding.installationId,
    capabilityRouteId: revisionMatches ? route.capabilityRouteId : null,
    appCode: revisionMatches ? route.appCode : null,
    appVersion: revisionMatches ? route.appVersion : null,
    routeRevision: revisionMatches ? route.routeRevision : null,
    ...(discoveryFailureCode
      ? { unavailableCode: discoveryFailureCode }
      : !route
        ? { unavailableCode: "ROUTE_NOT_FOUND" as const }
        : !functionKeyMatches
          ? { unavailableCode: "FUNCTION_KEY_MISMATCH" as const }
          : !revisionMatches
            ? { unavailableCode: "ROUTE_REVISION_MISMATCH" as const }
            : {}),
  };
}

function assertBindings(bindings: readonly CommerceFunctionBindingRef[], storeId: string): void {
  if (!storeId.trim()) throw new Error("storeId is required");
  const ids = new Set<string>();
  for (const binding of bindings) {
    if (
      !binding.functionBindingId.trim() ||
      !binding.installationId.trim() ||
      !binding.functionKey.trim() ||
      !binding.configurationRevision.trim() ||
      !binding.routeRevision.trim()
    ) {
      throw new Error("Function binding identity and revisions are required");
    }
    if (
      !binding.owner.service.trim() ||
      !binding.owner.resourceType.trim() ||
      !binding.owner.resourceId.trim() ||
      !Number.isSafeInteger(binding.precedence) ||
      !Number.isSafeInteger(binding.activationSequence) ||
      binding.activationSequence < 0
    ) {
      throw new Error(
        `Function binding "${binding.functionBindingId}" has invalid ordering or owner metadata`,
      );
    }
    if (ids.has(binding.functionBindingId)) {
      throw new Error(`Duplicate function binding "${binding.functionBindingId}"`);
    }
    ids.add(binding.functionBindingId);
  }
}

function revisionItem(item: FunctionExecutionPlanItem): unknown {
  if (item.implementationType === "NATIVE") {
    return {
      implementationType: item.implementationType,
      implementationId: item.implementationId,
      nativeAction: item.nativeAction,
      precedence: item.precedence,
      activationSequence: item.activationSequence,
      failureMode: item.failureMode,
    };
  }
  return {
    implementationType: item.implementationType,
    implementationId: item.implementationId,
    functionBindingId: item.functionBindingId,
    functionKey: item.functionKey,
    owner: item.owner,
    configurationRevision: item.configurationRevision,
    configurationSnapshotDigest: item.configurationSnapshotDigest,
    precedence: item.precedence,
    activationSequence: item.activationSequence,
    failureMode: item.failureMode,
    installationId: item.installationId,
    capabilityRouteId: item.capabilityRouteId,
    appCode: item.appCode,
    appVersion: item.appVersion,
    routeRevision: item.routeRevision,
    ...(item.unavailableCode ? { unavailableCode: item.unavailableCode } : {}),
  };
}

async function settleByDeadline<T>(promise: Promise<T>, deadlineAt: string): Promise<T> {
  const remainingMs = Date.parse(deadlineAt) - Date.now();
  if (remainingMs <= 0) {
    throw new DiscoveryDeadlineExceededError();
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const guarded = promise.then(
    (value) => ({ kind: "result" as const, value }),
    (error) => ({ kind: "error" as const, error }),
  );
  const timeout = new Promise<{ kind: "timeout" }>((resolve) => {
    timer = setTimeout(() => resolve({ kind: "timeout" }), remainingMs);
  });
  const settled = await Promise.race([guarded, timeout]);
  if (timer) clearTimeout(timer);
  if (settled.kind === "timeout") {
    throw new DiscoveryDeadlineExceededError();
  }
  if (settled.kind === "error") throw settled.error;
  return settled.value;
}

class DiscoveryDeadlineExceededError extends Error {
  constructor() {
    super("Commerce Function route discovery deadline exceeded");
    this.name = "DiscoveryDeadlineExceededError";
  }
}
