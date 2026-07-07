import { Injectable } from "@nestjs/common";
import {
  buildIdempotencyKey,
  BrokerWorkflows,
  DBOS,
  hashContent,
  type IdempotencyContext,
  InjectBroker,
  RetryableError,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import type { Catalog } from "@shopana/broker-types";
import { Kernel } from "../kernel/Kernel.js";
import { Loader } from "../loaders/Loader.js";
import { runWithContext, ServiceContext } from "../context/index.js";
import type { Facet, FacetSource, FacetValue } from "../repositories/models/index.js";
import {
  FacetReferenceStateWriteReconciliationScript,
  type FacetReferenceStateWriteReconciliationResult,
  type ReferenceStatusUpdate,
} from "../scripts/facet/FacetReferenceStateWriteReconciliationScript.js";

export type FacetReferenceStateSyncReason =
  | "productCreated"
  | "productUpdated"
  | "productDeleted";

export interface FacetReferenceStateSyncWorkflowInput {
  organizationId: string;
  storeId: string;
  reason: FacetReferenceStateSyncReason;
  productIds?: string[];
  sourceSequence?: number;
  facetIds?: string[];
  checkValues?: boolean;
  refs?: FacetSourceRef[];
  events?: FacetReferenceSyncEventInput[];
  userId?: string;
}

export interface FacetReferenceStateSyncWorkflowResult {
  checkedSourceCount: number;
  staleSourceCount: number;
  checkedValueCount: number;
  staleValueCount: number;
  affectedFacetIds?: string[];
  affectedSourceIds?: string[];
  affectedValueIds?: string[];
}

export interface FacetSourceRef {
  facetType: "TAG" | "OPTION" | "FEATURE";
  sourceHandle: string;
  valueHandle?: string;
}

export interface FacetReferenceChange {
  reason: string;
  before?: FacetSourceRef;
  after?: FacetSourceRef;
}

export interface FacetReferenceSyncEventInput {
  eventId: string;
  eventType: string;
  timestamp?: string;
  refs?: FacetReferenceChange[];
  payload?: unknown;
}

interface NormalizedEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  refs: FacetReferenceChange[];
  payload: unknown;
}

interface CollectedRefs {
  refs: FacetSourceRef[];
  facetIds: string[];
  reconcileAll: boolean;
}

type ReferenceStatus = FacetSource["referenceStatus"];
const REFERENCE_VALUE_FACET_TYPES = ["TAG", "OPTION", "FEATURE"] as const;

interface ReferenceExistence {
  tagHandles: ReadonlySet<string>;
  optionSourceHandles: ReadonlySet<string>;
  optionValueHandles: ReadonlySet<string>;
  featureSourceHandles: ReadonlySet<string>;
  featureValueHandles: ReadonlySet<string>;
}

interface ReconciliationPlan {
  store: StoreContextStore;
  sources: FacetSource[];
  values: FacetValue[];
  sourceUpdates: ReferenceStatusUpdate[];
  valueUpdates: ReferenceStatusUpdate[];
  affectedFacetIds: string[];
  affectedSourceIds: string[];
  affectedValueIds: string[];
}

interface ReconciliationResult {
  checkedSourceCount: number;
  staleSourceCount: number;
  checkedValueCount: number;
  staleValueCount: number;
  affectedFacetIds: string[];
  affectedSourceIds: string[];
  affectedValueIds: string[];
}

type StoreContextStore = {
  id: string;
  organizationId: string;
  defaultLocale: string;
  timezone?: string | null;
  email?: string | null;
  defaultCurrency?: string | null;
};

type StoreContextResult = {
  store: StoreContextStore | null;
  userErrors: Array<{ message: string }>;
};

@Injectable()
export class FacetReferenceStateSyncWorkflow extends BrokerWorkflows<
  FacetReferenceStateSyncWorkflowInput,
  FacetReferenceStateSyncWorkflowResult
> {
  constructor(@InjectBroker("listing") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  private get repository() {
    return this.kernel.repository;
  }

  @Workflow("syncFacetReferenceState")
  async run(
    input: FacetReferenceStateSyncWorkflowInput
  ): Promise<FacetReferenceStateSyncWorkflowResult> {
    const events = await this.stepNormalizeEvents(input.events ?? []);
    const collected = await this.stepCollectAffectedRefs(input, events);

    if (
      collected.refs.length === 0 &&
      collected.facetIds.length === 0 &&
      !collected.reconcileAll
    ) {
      return emptyResult(input.storeId);
    }

    const reconciliationPlan = await this.stepPrepareReconciliation(
      input,
      collected
    );
    const reconciliation = await this.stepWriteReconciliation(
      input,
      reconciliationPlan
    );
    const result = await this.stepPrepareResult(
      reconciliationPlan,
      reconciliation
    );

    return {
      checkedSourceCount: result.checkedSourceCount,
      staleSourceCount: result.staleSourceCount,
      checkedValueCount: result.checkedValueCount,
      staleValueCount: result.staleValueCount,
      affectedFacetIds: result.affectedFacetIds,
      affectedSourceIds: result.affectedSourceIds,
      affectedValueIds: result.affectedValueIds,
    };
  }

  @WorkflowStep({ name: "normalizeFacetReferenceEvents" })
  private async stepNormalizeEvents(
    events: readonly FacetReferenceSyncEventInput[]
  ): Promise<NormalizedEvent[]> {
    return events
      .filter(isFacetRelevantEvent)
      .map((event) => ({
        eventId: event.eventId,
        eventType: event.eventType,
        timestamp: event.timestamp ?? "",
        refs: [
          ...(event.refs ?? []),
          ...extractPayloadRefs(event),
        ],
        payload: event.payload,
      }))
      .filter(
        (event, index, all) =>
          all.findIndex((candidate) => candidate.eventId === event.eventId) ===
          index
      )
      .sort(
        (left, right) =>
          left.timestamp.localeCompare(right.timestamp) ||
          left.eventId.localeCompare(right.eventId)
      );
  }

  @WorkflowStep({
    name: "collectFacetReferenceRefs",
    timeoutMs: 60_000,
    retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 },
  })
  private async stepCollectAffectedRefs(
    input: FacetReferenceStateSyncWorkflowInput,
    events: readonly NormalizedEvent[]
  ): Promise<CollectedRefs> {
    const refs: FacetSourceRef[] = [];

    refs.push(...(input.refs ?? []));
    for (const event of events) {
      refs.push(...event.refs.flatMap(expandChangeRefs));
    }

    if (input.reason === "productCreated" && refs.length === 0) {
      refs.push(...(await this.collectCurrentProductRefs(input)));
    }

    if (input.reason === "productUpdated" && refs.length === 0) {
      refs.push(...(await this.collectCurrentProductRefs(input)));
      if (refs.length === 0) {
        return {
          refs: [],
          facetIds: unique(input.facetIds ?? []),
          reconcileAll: true,
        };
      }
    }

    return {
      refs: uniqueFacetSourceRefs(refs),
      facetIds: unique(input.facetIds ?? []),
      reconcileAll:
        input.reason === "productDeleted" &&
        refs.length === 0 &&
        (input.facetIds ?? []).length === 0,
    };
  }

  @WorkflowStep({
    name: "prepareFacetReferenceStateReconciliation",
    timeoutMs: 120_000,
    retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 },
  })
  private async stepPrepareReconciliation(
    input: FacetReferenceStateSyncWorkflowInput,
    collected: CollectedRefs
  ): Promise<ReconciliationPlan> {
    return this.withListingContext(input, async (store) => {
      const sources = await this.loadAffectedSources(collected);
      const values = input.checkValues === false
        ? []
        : await this.loadAffectedValues(collected);
      const affectedFacetIds = unique([
        ...sources.map((source) => source.facetId),
        ...values.map((value) => value.facetId),
      ]);
      const facets = await this.repository.facet.getByIds(affectedFacetIds);
      const facetsById = new Map(facets.map((facet) => [facet.id, facet]));
      const existence = await this.loadReferenceExistence(
        input.storeId,
        sources,
        values,
        facetsById
      );
      const sourceUpdates = sources.map((source) => ({
        id: source.id,
        nextStatus: resolveSourceStatus(source, existence),
      }));
      const valueUpdates = values.map((value) => ({
        id: value.id,
        nextStatus: resolveValueStatus(value, facetsById, existence),
      }));

      return {
        store,
        sources,
        values,
        sourceUpdates,
        valueUpdates,
        affectedFacetIds,
        affectedSourceIds: sources.map((source) => source.id),
        affectedValueIds: values.map((value) => value.id),
      };
    });
  }

  @WorkflowStep({
    name: "writeFacetReferenceStateReconciliation",
    timeoutMs: 120_000,
    retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 },
  })
  private async stepWriteReconciliation(
    input: FacetReferenceStateSyncWorkflowInput,
    plan: ReconciliationPlan
  ): Promise<FacetReferenceStateWriteReconciliationResult> {
    return this.withResolvedListingContext(input, plan.store, async () => {
      return this.kernel.runScript(
        FacetReferenceStateWriteReconciliationScript,
        {
          sourceUpdates: plan.sourceUpdates,
          valueUpdates: plan.valueUpdates,
        }
      );
    });
  }

  @WorkflowStep({
    name: "prepareFacetReferenceStateResult",
    timeoutMs: 30_000,
    retry: { maxAttempts: 3, intervalSeconds: 1, backoffRate: 2 },
  })
  private async stepPrepareResult(
    plan: ReconciliationPlan,
    reconciliation: FacetReferenceStateWriteReconciliationResult
  ): Promise<ReconciliationResult> {
    return {
      checkedSourceCount: plan.sources.length,
      staleSourceCount: reconciliation.sourceDeltas.filter(
        (delta) => delta.nextStatus === "STALE"
      ).length,
      checkedValueCount: plan.values.length,
      staleValueCount: reconciliation.valueDeltas.filter(
        (delta) => delta.nextStatus === "STALE"
      ).length,
      affectedFacetIds: plan.affectedFacetIds,
      affectedSourceIds: plan.affectedSourceIds,
      affectedValueIds: plan.affectedValueIds,
    };
  }

  private async collectCurrentProductRefs(
    input: FacetReferenceStateSyncWorkflowInput
  ): Promise<FacetSourceRef[]> {
    const refs: FacetSourceRef[] = [];
    for (const productId of unique(input.productIds ?? [])) {
      const queryResult = await this.broker.call<
        Catalog.CatalogQueryResult,
        Catalog.CatalogQueryParams
      >("catalog.query", {
        storeId: input.storeId,
        selection: buildProductReferenceSelection(productId),
      });

      if (!queryResult.ok) {
        if (queryResult.retryable) {
          throw new RetryableError(
            `Catalog product reference query failed: ${queryResult.code}: ${queryResult.message}`
          );
        }

        throw new Error(
          `Catalog product reference query failed: ${queryResult.code}: ${queryResult.message}`
        );
      }

      const product = queryResult.data.products?.edges?.[0]?.node;
      if (product) {
        refs.push(...extractProductSnapshotRefs(product));
      }
    }

    return refs;
  }

  private async loadAffectedSources(
    collected: CollectedRefs
  ): Promise<FacetSource[]> {
    const rows = [
      ...(collected.reconcileAll
        ? await this.repository.facet.getAllReferenceSources()
        : []),
      ...(collected.facetIds.length > 0
        ? await this.repository.facet.getReferenceSourcesByFacetIds(
            collected.facetIds
          )
        : []),
      ...(collected.refs.length > 0
        ? await this.repository.facet.getReferenceSourcesByRefs(collected.refs)
        : []),
    ];

    return [...new Map(rows.map((row) => [row.id, row])).values()].sort(
      (left, right) =>
        left.facetType.localeCompare(right.facetType) ||
        left.handle.localeCompare(right.handle) ||
        left.id.localeCompare(right.id)
    );
  }

  private async loadAffectedValues(
    collected: CollectedRefs
  ): Promise<FacetValue[]> {
    const rows = [
      ...(collected.reconcileAll
        ? await this.repository.facetValue.getSourceValuesByFacetTypes(
            REFERENCE_VALUE_FACET_TYPES
          )
        : []),
      ...(collected.facetIds.length > 0
        ? await this.repository.facetValue.getSourceValuesByFacetIds(
            collected.facetIds
          )
        : []),
      ...(collected.refs.length > 0
        ? await this.repository.facetValue.getSourceValuesBySourceRefs(
            collected.refs
          )
        : []),
    ];

    return [...new Map(rows.map((row) => [row.id, row])).values()].sort(
      (left, right) =>
        left.facetId.localeCompare(right.facetId) ||
        left.handle.localeCompare(right.handle) ||
        left.id.localeCompare(right.id)
    );
  }

  private async loadReferenceExistence(
    _storeId: string,
    sources: readonly FacetSource[],
    values: readonly FacetValue[],
    facetsById: ReadonlyMap<string, Facet>
  ): Promise<ReferenceExistence> {
    const optionSourceHandles = new Set<string>();
    const featureSourceHandles = new Set<string>();

    await Promise.all(
      sources.map(async (source) => {
        if (source.facetType !== "OPTION" && source.facetType !== "FEATURE") {
          return;
        }

        const candidate = await this.repository.facet.findSourceCandidateByRef({
          facetType: source.facetType,
          handle: source.handle,
        });
        if (!candidate) return;
        if (source.facetType === "OPTION") optionSourceHandles.add(source.handle);
        if (source.facetType === "FEATURE") featureSourceHandles.add(source.handle);
      })
    );

    const tagHandles = new Set<string>();
    const optionValueHandles = new Set<string>();
    const featureValueHandles = new Set<string>();
    const valuesByType = groupBy(values, (value) =>
      valueFacetType(value, facetsById) ?? "UNKNOWN"
    );

    const tagValues = valuesByType.get("TAG") ?? [];
    if (tagValues.length > 0) {
      const candidates = await this.repository.facet.findValueCandidatesByHandles({
        candidateType: "TAG",
        sourceHandles: ["tags"],
        handles: unique(tagValues.map((value) => value.handle)),
      });
      for (const candidate of candidates) tagHandles.add(candidate.handle);
    }

    const optionValues = valuesByType.get("OPTION") ?? [];
    if (optionValues.length > 0) {
      const candidates = await this.repository.facet.findValueCandidatesByHandles({
        candidateType: "OPTION",
        sourceHandles: unique(
          optionValues
            .map((value) => splitCompositeHandle(value.handle)?.sourceHandle)
            .filter(isString)
        ),
        handles: unique(optionValues.map((value) => value.handle)),
      });
      for (const candidate of candidates) optionValueHandles.add(candidate.handle);
    }

    const featureValues = valuesByType.get("FEATURE") ?? [];
    if (featureValues.length > 0) {
      const candidates = await this.repository.facet.findValueCandidatesByHandles({
        candidateType: "FEATURE",
        sourceHandles: unique(
          featureValues
            .map((value) => splitCompositeHandle(value.handle)?.sourceHandle)
            .filter(isString)
        ),
        handles: unique(featureValues.map((value) => value.handle)),
      });
      for (const candidate of candidates) featureValueHandles.add(candidate.handle);
    }

    return {
      tagHandles,
      optionSourceHandles,
      optionValueHandles,
      featureSourceHandles,
      featureValueHandles,
    };
  }

  private async withListingContext<TResult>(
    input: FacetReferenceStateSyncWorkflowInput,
    fn: (store: StoreContextStore) => Promise<TResult>
  ): Promise<TResult> {
    const storeResult = await this.broker.call<
      StoreContextResult,
      { id: string }
    >("project.getStoreById", { id: input.storeId });

    if (!storeResult.store) {
      throw new Error(
        storeResult.userErrors[0]?.message ??
          `Store with id "${input.storeId}" not found`
      );
    }

    const store = storeResult.store;
    if (store.organizationId !== input.organizationId) {
      throw new Error(
        `Store organization mismatch for "${input.storeId}": expected ${input.organizationId}, got ${store.organizationId}`
      );
    }

    return this.withResolvedListingContext(input, store, () => fn(store));
  }

  private async withResolvedListingContext<TResult>(
    input: FacetReferenceStateSyncWorkflowInput,
    store: StoreContextStore,
    fn: () => Promise<TResult>
  ): Promise<TResult> {
    const context = new ServiceContext({
      requestId: `facet-reference-sync:${DBOS.workflowID ?? input.storeId}`,
      kernel: this.kernel,
      loaders: new Loader(this.repository),
      locale: store.defaultLocale,
      store: {
        id: store.id,
        name: store.id,
        displayName: store.id,
        organizationId: store.organizationId,
        timezone: store.timezone ?? "UTC",
        email: store.email ?? null,
        defaultLocale: store.defaultLocale,
        defaultCurrency: store.defaultCurrency ?? "UAH",
      },
      user: input.userId ? { id: input.userId, name: "workflow-user" } : undefined,
    });

    return runWithContext(context, fn);
  }
}

function emptyResult(_storeId: string): FacetReferenceStateSyncWorkflowResult {
  return {
    checkedSourceCount: 0,
    staleSourceCount: 0,
    checkedValueCount: 0,
    staleValueCount: 0,
    affectedFacetIds: [],
    affectedSourceIds: [],
    affectedValueIds: [],
  };
}

function isFacetRelevantEvent(event: FacetReferenceSyncEventInput): boolean {
  if ((event.refs?.length ?? 0) > 0) return true;
  if (
    event.eventType === "productCreated" ||
    event.eventType === "productDeleted"
  ) {
    return true;
  }
  if (event.eventType !== "productUpdated") return false;

  const reasons = asRecord(event.payload).reasons;
  return (
    Array.isArray(reasons) &&
    reasons.some(
      (reason) =>
        reason === "tag" ||
        reason === "options" ||
        reason === "features" ||
        reason === "variant"
    )
  );
}

function extractPayloadRefs(
  event: FacetReferenceSyncEventInput
): FacetReferenceChange[] {
  const payload = asRecord(event.payload);
  return [
    ...extractRefs(payload.facetReferenceRefs),
    ...extractRefs(asRecord(asRecord(payload.product).options).refs),
    ...extractRefs(asRecord(asRecord(payload.product).features).refs),
  ];
}

function expandChangeRefs(change: FacetReferenceChange): FacetSourceRef[] {
  return [change.before, change.after].filter(isFacetSourceRef);
}

function extractRefs(value: unknown): FacetReferenceChange[] {
  return Array.isArray(value) ? value.filter(isFacetReferenceChange) : [];
}

function resolveSourceStatus(
  source: FacetSource,
  existence: ReferenceExistence
): ReferenceStatus {
  if (source.facetType === "TAG") {
    return source.handle === "tags" ? "VALID" : "STALE";
  }
  if (source.facetType === "OPTION") {
    return existence.optionSourceHandles.has(source.handle) ? "VALID" : "STALE";
  }
  if (source.facetType === "FEATURE") {
    return existence.featureSourceHandles.has(source.handle) ? "VALID" : "STALE";
  }

  return "STALE";
}

function resolveValueStatus(
  value: FacetValue,
  facetsById: ReadonlyMap<string, Facet>,
  existence: ReferenceExistence
): ReferenceStatus {
  const type = valueFacetType(value, facetsById);
  if (type === "TAG") {
    return existence.tagHandles.has(value.handle) ? "VALID" : "STALE";
  }
  if (type === "OPTION") {
    return existence.optionValueHandles.has(value.handle) ? "VALID" : "STALE";
  }
  if (type === "FEATURE") {
    return existence.featureValueHandles.has(value.handle) ? "VALID" : "STALE";
  }

  return "STALE";
}

function valueFacetType(
  value: FacetValue,
  facetsById: ReadonlyMap<string, Facet>
): FacetSourceRef["facetType"] | null {
  const facetType = facetsById.get(value.facetId)?.facetType;
  return facetType === "TAG" ||
    facetType === "OPTION" ||
    facetType === "FEATURE"
    ? facetType
    : null;
}

function splitCompositeHandle(
  handle: string
): { sourceHandle: string; valueHandle: string } | null {
  const index = handle.indexOf(":");
  if (index <= 0 || index === handle.length - 1) return null;
  return {
    sourceHandle: handle.slice(0, index),
    valueHandle: handle.slice(index + 1),
  };
}

function uniqueFacetSourceRefs(refs: readonly FacetSourceRef[]): FacetSourceRef[] {
  return [
    ...new Map(
      refs
        .filter(isFacetSourceRef)
        .map((ref) => [
          JSON.stringify([ref.facetType, ref.sourceHandle, ref.valueHandle ?? ""]),
          ref,
        ])
    ).values(),
  ];
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
    isString(record.sourceHandle) &&
    (record.valueHandle === undefined || isString(record.valueHandle))
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

function extractProductSnapshotRefs(product: Catalog.CatalogProductSnapshot): FacetSourceRef[] {
  const refs: FacetSourceRef[] = [
    ...product.tags.map((tag) => ({
      facetType: "TAG" as const,
      sourceHandle: "tags",
      valueHandle: tag.handle,
    })),
    ...product.features.flatMap((feature) =>
      feature.values.map((value) => ({
        facetType: "FEATURE" as const,
        sourceHandle: feature.handle,
        valueHandle: `${feature.handle}:${value.handle}`,
      }))
    ),
    ...product.variants.flatMap((variant) =>
      variant.options.flatMap((option) =>
        option.values.map((value) => ({
          facetType: "OPTION" as const,
          sourceHandle: option.handle,
          valueHandle: `${option.handle}:${value.handle}`,
        }))
      )
    ),
  ];

  return uniqueFacetSourceRefs(refs);
}

function buildProductReferenceSelection(productId: string): Catalog.CatalogQuerySelection {
  return {
    populate: {
      products: {
        fieldName: "products",
        args: {
          first: 1,
          where: { id: { _eq: productId } },
        },
        populate: {
          edges: {
            fieldName: "edges",
            populate: {
              node: {
                fields: ["id", "storeId"],
                populate: {
                  tags: {
                    fieldName: "tags",
                    fields: ["id", "handle"],
                  },
                  features: {
                    fieldName: "features",
                    fields: ["id", "handle"],
                    populate: {
                      values: {
                        fieldName: "values",
                        fields: ["id", "handle"],
                      },
                    },
                  },
                  variants: {
                    fieldName: "variants",
                    fields: ["id", "handle"],
                    populate: {
                      options: {
                        fieldName: "options",
                        fields: ["id", "handle"],
                        populate: {
                          values: {
                            fieldName: "values",
                            fields: ["id", "handle"],
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

export function buildFacetReferenceStateSyncWorkflowIdempotencyContext(input: {
  organizationId: string;
  productId: string;
  reason: FacetReferenceStateSyncReason;
  sourceSequence: number;
  eventId?: string;
  operationId?: string;
  actionType?: string;
  refsHash?: string;
}): IdempotencyContext {
  const content: Record<string, unknown> = {
    v: 1,
    productId: input.productId,
    reason: input.reason,
    sourceSequence: input.sourceSequence,
  };
  if (input.eventId !== undefined) content.eventId = input.eventId;
  if (input.operationId !== undefined) content.operationId = input.operationId;
  if (input.actionType !== undefined) content.actionType = input.actionType;
  if (input.refsHash !== undefined) content.refsHash = input.refsHash;

  return {
    source: "content",
    organizationId: input.organizationId,
    resourceId: `product:${input.productId}`,
    operation: `listing.syncFacetReferenceState.${input.reason}`,
    contentHash: hashContent(content),
  };
}

export function buildFacetReferenceStateSyncWorkflowId(input: {
  idempotencyCtx: IdempotencyContext;
}): string {
  return buildIdempotencyKey(
    "listing.syncFacetReferenceState",
    input.idempotencyCtx
  );
}

export function buildFacetReferenceStateSyncQueuePartitionKey(input: {
  storeId: string;
  productId: string;
}): string {
  return ["facet-reference-state", input.storeId, "product", input.productId].join(
    ":"
  );
}
