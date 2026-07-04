import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  DBOS,
  InjectBroker,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import type {
  EventDispatchResult,
  EventEmitResult,
  FacetReferenceChange,
  FacetReferenceStateChangedPayload,
  FacetSourceRef,
  ReferenceStatus,
  ReferenceStatusDelta,
} from "@shopana/events";
import { Kernel } from "../kernel/Kernel.js";
import type {
  FacetReferenceDisplayParentRow,
  FacetReferenceSourceRow,
  FacetReferenceValueRow,
} from "../repositories/facet/FacetReferenceRepository.js";
import type {
  FacetReferenceSyncEventInput,
  FacetReferenceSyncWorkflowInput,
  FacetReferenceSyncWorkflowResult,
} from "./dto/FacetReferenceSyncWorkflowDto.js";

type NormalizedEvent = FacetReferenceSyncEventInput;

interface CollectedRefs {
  refs: FacetSourceRef[];
  triggerEventIds: string[];
}

interface ReconciliationResult {
  affectedFacetIds: string[];
  affectedFacetValueIds: string[];
  affectedDisplayValueIds: string[];
  sourceDeltas: ReferenceStatusDelta[];
  valueDeltas: ReferenceStatusDelta[];
  facetEvents: FacetReferenceStateChangedPayload[];
}

interface ReferenceExistence {
  tagHandles: Set<string>;
  optionSources: Set<string>;
  optionValues: Set<string>;
  featureSources: Set<string>;
  featureValues: Set<string>;
}

interface FacetEventAccumulator {
  facetId: string;
  sourceChanges: ReferenceStatusDelta[];
  valueChanges: ReferenceStatusDelta[];
  changedFacetSourceIds: Set<string>;
  changedFacetValueIds: Set<string>;
  affectedDisplayValueIds: Set<string>;
  touchedSourceHandles: Set<string>;
  touchedSourceValueHandles: Set<string>;
}

@Injectable()
export class FacetReferenceSyncWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("catalog") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  private get repository() {
    return this.kernel.repository.facetReference;
  }

  @Workflow("facetReferenceSync")
  async run(
    input: FacetReferenceSyncWorkflowInput
  ): Promise<FacetReferenceSyncWorkflowResult> {
    const events = await this.stepNormalizeEvents(input.events);
    if (events.length === 0) {
      return emptyResult(input.storeId);
    }

    const collected = await this.stepCollectAffectedRefs(input, events);
    if (collected.refs.length === 0) {
      return emptyResult(input.storeId);
    }

    const reconciliation = await this.stepReconcile(input, collected);
    const emittedEventIds = await this.emitFacetEvents(
      input,
      reconciliation.facetEvents
    );

    return {
      storeId: input.storeId,
      affectedFacetIds: reconciliation.affectedFacetIds,
      affectedFacetValueIds: reconciliation.affectedFacetValueIds,
      affectedDisplayValueIds: reconciliation.affectedDisplayValueIds,
      sourceStatusChanged: reconciliation.sourceDeltas.length,
      valueStatusChanged: reconciliation.valueDeltas.length,
      emittedEventIds,
    };
  }

  @WorkflowStep()
  private async stepNormalizeEvents(
    events: readonly FacetReferenceSyncEventInput[]
  ): Promise<NormalizedEvent[]> {
    const byId = new Map<string, FacetReferenceSyncEventInput>();
    for (const event of events) {
      if (!isFacetRelevantEvent(event)) continue;
      byId.set(event.eventId, event);
    }

    return [...byId.values()].sort((left, right) => {
      const timeDiff =
        Date.parse(left.timestamp || "") - Date.parse(right.timestamp || "");
      return timeDiff !== 0 ? timeDiff : left.eventId.localeCompare(right.eventId);
    });
  }

  @WorkflowStep()
  private async stepCollectAffectedRefs(
    input: FacetReferenceSyncWorkflowInput,
    events: readonly NormalizedEvent[]
  ): Promise<CollectedRefs> {
    const changes: FacetReferenceChange[] = [];
    let requiresFullReconciliation = false;

    for (const event of events) {
      changes.push(...(event.refs ?? []));
      changes.push(...extractPayloadRefs(event));

      if (event.eventType === "productCreated" && event.productId) {
        changes.push(
          ...(await this.repository.hydrateProductSnapshotRefs(
            input.storeId,
            event.productId,
            "productCreated"
          ))
        );
      }

      if (event.eventType === "productUpdated") {
        changes.push(
          ...(await this.collectProductUpdatedRefs(input.storeId, event))
        );
      }

      if (event.eventType === "productDeleted" && event.productId) {
        const deleteRefs = [
          ...(event.refs ?? []),
          ...extractPayloadRefs(event),
        ];
        if (deleteRefs.length === 0) {
          const hydrated = await this.repository.hydrateProductSnapshotRefs(
            input.storeId,
            event.productId,
            "productDeleted"
          );
          if (hydrated.length > 0) {
            changes.push(...hydrated);
          } else {
            requiresFullReconciliation = true;
          }
        }
      }
    }

    if (requiresFullReconciliation) {
      this.logger.warn(
        {
          storeId: input.storeId,
          eventIds: events.map((event) => event.eventId),
        },
        "Falling back to full facet reference reconciliation"
      );
      changes.push(...(await this.repository.findAllPersistedSourceRefs(input.storeId)));
    }

    return {
      refs: uniqueFacetSourceRefs(changes.flatMap(expandChangeRefs)),
      triggerEventIds: events.map((event) => event.eventId),
    };
  }

  @WorkflowStep()
  private async stepReconcile(
    input: FacetReferenceSyncWorkflowInput,
    collected: CollectedRefs
  ): Promise<ReconciliationResult> {
    const checkedAt = new Date().toISOString();
    const sources = await this.repository.findAffectedSources(
      input.storeId,
      collected.refs
    );
    const values = await this.repository.findAffectedSourceValues(
      input.storeId,
      collected.refs,
      sources
    );
    const displayParents = await this.repository.findDisplayParents(
      input.storeId,
      values.map((value) => value.id)
    );

    const existence = await this.loadReferenceExistence(input.storeId, sources, values);
    const sourceDeltas: ReferenceStatusDelta[] = [];
    const valueDeltas: ReferenceStatusDelta[] = [];

    for (const source of sources) {
      const nextStatus = resolveSourceStatus(source, existence);
      const delta = await this.repository.refreshSourceStatus({
        storeId: input.storeId,
        row: source,
        nextStatus,
        checkedAt,
      });
      if (delta) sourceDeltas.push(delta);
    }

    const sourceByFacetId = groupBy(sources, (source) => source.facetId);
    for (const value of values) {
      const nextStatus = resolveValueStatus(
        value,
        sourceByFacetId.get(value.facetId) ?? [],
        existence
      );
      const displayParent = displayParents.get(value.id);
      const delta = await this.repository.refreshValueStatus({
        storeId: input.storeId,
        row: value,
        nextStatus,
        checkedAt,
        displayParentId: displayParent?.id,
      });
      if (delta) valueDeltas.push(delta);
    }

    const facetEvents = buildFacetEvents({
      storeId: input.storeId,
      triggerEventIds: collected.triggerEventIds,
      sources,
      values,
      displayParents,
      sourceDeltas,
      valueDeltas,
    });

    return {
      affectedFacetIds: unique([
        ...sources.map((source) => source.facetId),
        ...values.map((value) => value.facetId),
        ...sourceDeltas.map((delta) => delta.facetId),
        ...valueDeltas.map((delta) => delta.facetId),
      ]),
      affectedFacetValueIds: unique([
        ...values.map((value) => value.id),
        ...valueDeltas.map((delta) => delta.entityId),
      ]),
      affectedDisplayValueIds: unique([...displayParents.values()].map((row) => row.id)),
      sourceDeltas,
      valueDeltas,
      facetEvents,
    };
  }

  private async collectProductUpdatedRefs(
    storeId: string,
    event: NormalizedEvent
  ): Promise<FacetReferenceChange[]> {
    const payload = asRecord(event.payload);
    const productPayload = asRecord(payload.product);
    const changes: FacetReferenceChange[] = [];

    const tags = asRecord(productPayload.tags);
    const tagIds = Array.isArray(tags.tagIds) ? tags.tagIds.filter(isString) : [];
    if (tagIds.length > 0) {
      changes.push(...(await this.repository.hydrateTagRefsByIds(storeId, tagIds)));
    }

    const variantOptions = Object.values(asRecord(payload.variants)).flatMap(
      (variantValue) => {
        const variant = asRecord(variantValue);
        const options = Array.isArray(variant.options) ? variant.options : [];
        return options.flatMap((option) => {
          const optionRecord = asRecord(option);
          return isString(optionRecord.optionId) && isString(optionRecord.valueId)
            ? [{ optionId: optionRecord.optionId, valueId: optionRecord.valueId }]
            : [];
        });
      }
    );
    if (variantOptions.length > 0) {
      changes.push(
        ...(await this.repository.hydrateOptionValueRefsByLinks(
          storeId,
          variantOptions
        ))
      );
    }

    return changes;
  }

  private async loadReferenceExistence(
    storeId: string,
    sources: readonly FacetReferenceSourceRow[],
    values: readonly FacetReferenceValueRow[]
  ): Promise<ReferenceExistence> {
    const sourceByFacetId = groupBy(sources, (source) => source.facetId);
    const tagValueHandles = values
      .filter((value) => valueFacetType(value, sourceByFacetId.get(value.facetId) ?? []) === "TAG")
      .map((value) => value.handle);
    const optionSourceHandles = sources
      .filter((source) => source.facetType === "OPTION")
      .map((source) => source.handle);
    const optionValueHandles = values
      .filter((value) => valueFacetType(value, sourceByFacetId.get(value.facetId) ?? []) === "OPTION")
      .map((value) => value.handle);
    const featureSourceHandles = sources
      .filter((source) => source.facetType === "FEATURE")
      .map((source) => source.handle);
    const featureValueHandles = values
      .filter((value) => valueFacetType(value, sourceByFacetId.get(value.facetId) ?? []) === "FEATURE")
      .map((value) => value.handle);

    const [
      tagHandles,
      optionSources,
      optionValues,
      featureSources,
      featureValues,
    ] = await Promise.all([
      this.repository.findExistingTagHandles(storeId, tagValueHandles),
      this.repository.findExistingOptionSourceHandles(storeId, optionSourceHandles),
      this.repository.findExistingOptionValueHandles(storeId, optionValueHandles),
      this.repository.findExistingFeatureSourceHandles(storeId, featureSourceHandles),
      this.repository.findExistingFeatureValueHandles(storeId, featureValueHandles),
    ]);

    return {
      tagHandles,
      optionSources,
      optionValues,
      featureSources,
      featureValues,
    };
  }

  private async emitFacetEvents(
    input: FacetReferenceSyncWorkflowInput,
    payloads: readonly FacetReferenceStateChangedPayload[]
  ): Promise<string[]> {
    if (payloads.length === 0) return [];

    const batchKey = `catalog:facet-reference-sync:${input.storeId}:${DBOS.workflowID}`;
    const emittedEventIds: string[] = [];

    for (const payload of payloads) {
      const result = await this.broker.runWorkflow<EventEmitResult>(
        "events.emit",
        {
          eventType: "facetReferenceStateChanged",
          payload,
          source: "catalog",
          context: {
            tenantId: input.organizationId,
            userId: input.userId,
          },
          subject: { type: "facet", id: payload.facetId },
          actor: input.userId
            ? { type: "user", id: input.userId }
            : { type: "service", id: "catalog" },
          emitKey: `facet:${payload.facetId}:referenceState`,
          dispatch: {
            mode: "deferred",
            batchKey,
            aggregateKey: `facet:${payload.facetId}`,
          },
        },
        {
          source: "workflow",
          workflowId: DBOS.workflowID!,
          stepId: "emitFacetReferenceStateChanged",
          callId: payload.facetId,
          tenantId: input.organizationId,
        }
      );
      emittedEventIds.push(result.eventId);
    }

    await this.broker.call<EventDispatchResult>("events.dispatch", {
      kind: "batch",
      tenantId: input.organizationId,
      batchKey,
      waitForResult: true,
    });

    return emittedEventIds;
  }
}

function emptyResult(storeId: string): FacetReferenceSyncWorkflowResult {
  return {
    storeId,
    affectedFacetIds: [],
    affectedFacetValueIds: [],
    affectedDisplayValueIds: [],
    sourceStatusChanged: 0,
    valueStatusChanged: 0,
    emittedEventIds: [],
  };
}

function isFacetRelevantEvent(event: FacetReferenceSyncEventInput): boolean {
  if (event.refs && event.refs.length > 0) return true;
  if (
    event.eventType === "productCreated" ||
    event.eventType === "productDeleted"
  ) {
    return true;
  }
  if (event.eventType !== "productUpdated") {
    return false;
  }

  const payload = asRecord(event.payload);
  const productPayload = asRecord(payload.product);
  const tags = asRecord(productPayload.tags);
  const options = asRecord(productPayload.options);
  const features = asRecord(productPayload.features);
  if (tags.changed === true || options.changed === true || features.changed === true) {
    return true;
  }

  return Object.values(asRecord(payload.variants)).some((variantValue) => {
    const variant = asRecord(variantValue);
    return Array.isArray(variant.options) && variant.options.length > 0;
  });
}

function extractPayloadRefs(
  event: FacetReferenceSyncEventInput
): FacetReferenceChange[] {
  const payload = asRecord(event.payload);
  const productPayload = asRecord(payload.product);

  return [
    ...extractRefs(asRecord(productPayload.options).refs),
    ...extractRefs(asRecord(productPayload.features).refs),
    ...extractRefs(payload.facetReferenceRefs),
  ];
}

function expandChangeRefs(change: FacetReferenceChange): FacetSourceRef[] {
  return [change.before, change.after].filter(isFacetSourceRef);
}

function extractRefs(value: unknown): FacetReferenceChange[] {
  return Array.isArray(value) ? value.filter(isFacetReferenceChange) : [];
}

function resolveSourceStatus(
  source: FacetReferenceSourceRow,
  existence: ReferenceExistence
): ReferenceStatus {
  if (source.facetType === "TAG") {
    return source.handle === "tags" ? "VALID" : "STALE";
  }
  if (source.facetType === "OPTION") {
    return existence.optionSources.has(source.handle) ? "VALID" : "STALE";
  }
  return existence.featureSources.has(source.handle) ? "VALID" : "STALE";
}

function resolveValueStatus(
  value: FacetReferenceValueRow,
  sources: readonly FacetReferenceSourceRow[],
  existence: ReferenceExistence
): ReferenceStatus {
  const facetType = valueFacetType(value, sources);
  if (facetType === "TAG") {
    return existence.tagHandles.has(value.handle) ? "VALID" : "STALE";
  }
  if (facetType === "OPTION") {
    return existence.optionValues.has(value.handle) ? "VALID" : "STALE";
  }
  if (facetType === "FEATURE") {
    return existence.featureValues.has(value.handle) ? "VALID" : "STALE";
  }
  return "STALE";
}

function buildFacetEvents(input: {
  storeId: string;
  triggerEventIds: string[];
  sources: readonly FacetReferenceSourceRow[];
  values: readonly FacetReferenceValueRow[];
  displayParents: ReadonlyMap<string, FacetReferenceDisplayParentRow>;
  sourceDeltas: readonly ReferenceStatusDelta[];
  valueDeltas: readonly ReferenceStatusDelta[];
}): FacetReferenceStateChangedPayload[] {
  const acc = new Map<string, FacetEventAccumulator>();

  for (const source of input.sources) {
    const item = getFacetAccumulator(acc, input.storeId, source.facetId);
    item.touchedSourceHandles.add(source.handle);
  }

  for (const value of input.values) {
    const item = getFacetAccumulator(acc, input.storeId, value.facetId);
    item.touchedSourceValueHandles.add(value.handle);
    const parent = input.displayParents.get(value.id);
    if (parent) {
      item.affectedDisplayValueIds.add(parent.id);
    }
  }

  for (const delta of input.sourceDeltas) {
    const item = getFacetAccumulator(acc, input.storeId, delta.facetId);
    item.sourceChanges.push(delta);
    item.changedFacetSourceIds.add(delta.entityId);
  }

  for (const delta of input.valueDeltas) {
    const item = getFacetAccumulator(acc, input.storeId, delta.facetId);
    item.valueChanges.push(delta);
    item.changedFacetValueIds.add(delta.entityId);
    if (delta.displayParentId) {
      item.affectedDisplayValueIds.add(delta.displayParentId);
    }
  }

  return [...acc.values()]
    .map((item) => {
      const reasons: FacetReferenceStateChangedPayload["reasons"] = [];
      if (item.sourceChanges.length > 0 || item.valueChanges.length > 0) {
        reasons.push("referenceStateChanged");
      }
      if (item.touchedSourceHandles.size > 0) {
        reasons.push("sourceSelectionChanged");
      }
      if (item.touchedSourceValueHandles.size > 0) {
        reasons.push("sourceValueSelectionChanged");
      }

      return {
        storeId: input.storeId,
        facetId: item.facetId,
        reasons,
        sourceChanges: item.sourceChanges,
        valueChanges: item.valueChanges,
        changedFacetSourceIds: [...item.changedFacetSourceIds].sort(),
        changedFacetValueIds: [...item.changedFacetValueIds].sort(),
        affectedDisplayValueIds: [...item.affectedDisplayValueIds].sort(),
        touchedSourceHandles: [...item.touchedSourceHandles].sort(),
        touchedSourceValueHandles: [...item.touchedSourceValueHandles].sort(),
        triggerEventIds: [...input.triggerEventIds].sort(),
      };
    })
    .filter((payload) => payload.reasons.length > 0)
    .sort((left, right) => left.facetId.localeCompare(right.facetId));
}

function getFacetAccumulator(
  acc: Map<string, FacetEventAccumulator>,
  _storeId: string,
  facetId: string
): FacetEventAccumulator {
  const existing = acc.get(facetId);
  if (existing) return existing;

  const created: FacetEventAccumulator = {
    facetId,
    sourceChanges: [],
    valueChanges: [],
    changedFacetSourceIds: new Set(),
    changedFacetValueIds: new Set(),
    affectedDisplayValueIds: new Set(),
    touchedSourceHandles: new Set(),
    touchedSourceValueHandles: new Set(),
  };
  acc.set(facetId, created);
  return created;
}

function valueFacetType(
  value: FacetReferenceValueRow,
  sources: readonly FacetReferenceSourceRow[]
): FacetSourceRef["facetType"] | null {
  const tagSource = sources.find((source) => source.facetType === "TAG");
  if (tagSource) return "TAG";

  const composite = splitCompositeHandle(value.handle);
  if (!composite) return null;

  const source = sources.find(
    (item) => item.handle === composite.sourceHandle
  );
  return source ? (source.facetType as FacetSourceRef["facetType"]) : null;
}

function splitCompositeHandle(
  handle: string
): { sourceHandle: string; valueHandle: string } | null {
  const separator = handle.indexOf(":");
  if (separator <= 0 || separator === handle.length - 1) {
    return null;
  }
  return {
    sourceHandle: handle.slice(0, separator),
    valueHandle: handle.slice(separator + 1),
  };
}

function uniqueFacetSourceRefs(refs: readonly FacetSourceRef[]): FacetSourceRef[] {
  const seen = new Set<string>();
  const result: FacetSourceRef[] = [];
  for (const ref of refs) {
    const key = JSON.stringify(ref);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(ref);
  }
  return result;
}

function isFacetReferenceChange(value: unknown): value is FacetReferenceChange {
  const record = asRecord(value);
  return (
    isString(record.reason) &&
    (record.before === undefined || isFacetSourceRef(record.before)) &&
    (record.after === undefined || isFacetSourceRef(record.after))
  );
}

function isFacetSourceRef(value: unknown): value is FacetSourceRef {
  const record = asRecord(value);
  return (
    (record.facetType === "TAG" ||
      record.facetType === "OPTION" ||
      record.facetType === "FEATURE") &&
    isString(record.sourceHandle)
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function groupBy<T, K>(items: readonly T[], keyOf: (item: T) => K): Map<K, T[]> {
  const result = new Map<K, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = result.get(key) ?? [];
    group.push(item);
    result.set(key, group);
  }
  return result;
}
