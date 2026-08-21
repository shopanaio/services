/**
 * @file Workflow Registry
 * @description Central registry for workflow instances with DBOS execution
 */

import { Inject, Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { DBOS, ConfiguredInstance } from "@dbos-inc/dbos-sdk";
import postgres from "postgres";
import type {
  WorkflowDuplicationPolicy,
  WorkflowHandle,
  WorkflowExecutionContext,
  WorkflowQueueEnqueueOptions,
  WorkflowStartOptions,
  WorkflowModuleConfig,
} from "../core/types.js";
import type { WorkflowDescriptor, WorkflowRegistrar } from "../workflow/BaseWorkflow.js";
import {
  buildIdempotencyKey,
  IdempotencyConflictError,
  type IdempotencyContext,
} from "../idempotency/index.js";
import { WORKFLOW_CONFIG } from "./tokens.js";

interface DBOSStartWorkflowParams {
  workflowID: string;
  queueName?: string;
  timeoutMS?: number;
  enqueueOptions?: WorkflowQueueEnqueueOptions;
  duplicationPolicy?: WorkflowDuplicationPolicy;
  workflowAttributes?: Record<string, unknown>;
}

const isWorkflowDescriptor = (value: unknown): value is WorkflowDescriptor => {
  if (!value || typeof value !== "object") {
    return false;
  }
  return "instance" in value && "metadata" in value;
};

@Injectable()
export class WorkflowRegistry implements WorkflowRegistrar, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowRegistry.name);
  private readonly workflows = new Map<string, WorkflowDescriptor>();
  private readonly lockDatabase: ReturnType<typeof postgres>;

  constructor(@Inject(WORKFLOW_CONFIG) config: WorkflowModuleConfig) {
    this.lockDatabase = postgres(config.databaseUrl, {
      onnotice: () => undefined,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.lockDatabase.end({ timeout: 5 });
  }

  /**
   * Register workflow with metadata.
   * Called automatically by BaseWorkflow/BaseSaga during onModuleInit.
   */
  register(qualifiedName: string, descriptor: WorkflowDescriptor): void;
  /**
   * Legacy registration API (instance only).
   * @deprecated Register a descriptor with metadata instead.
   */
  register(qualifiedName: string, workflow: unknown): void;
  register(qualifiedName: string, descriptorOrWorkflow: WorkflowDescriptor | unknown): void {
    if (this.workflows.has(qualifiedName)) {
      throw new Error(`Workflow "${qualifiedName}" already registered`);
    }

    const descriptor = isWorkflowDescriptor(descriptorOrWorkflow)
      ? descriptorOrWorkflow
      : {
          instance: descriptorOrWorkflow,
          metadata: {
            name: qualifiedName.includes(".")
              ? qualifiedName.split(".").slice(1).join(".")
              : qualifiedName,
          },
        };

    this.workflows.set(qualifiedName, descriptor);
    this.logger.debug(`Registered workflow: ${qualifiedName}`);
  }

  /**
   * Deregister workflow (for graceful shutdown).
   */
  deregister(qualifiedName: string): void {
    this.workflows.delete(qualifiedName);
  }

  /**
   * Get workflow descriptor by qualified name.
   * Throws if workflow not found.
   */
  getDescriptor(qualifiedName: string): WorkflowDescriptor {
    const descriptor = this.workflows.get(qualifiedName);
    if (!descriptor) {
      throw new Error(
        `Workflow "${qualifiedName}" not found. Available: ${this.list().join(", ")}`,
      );
    }
    return descriptor;
  }

  /**
   * Get workflow instance by name (legacy API, for backward compatibility).
   * @deprecated Use getDescriptor() for new code.
   */
  get<T>(name: string): T {
    return this.getDescriptor(name).instance as T;
  }

  /**
   * Check if workflow is registered.
   */
  has(qualifiedName: string): boolean {
    return this.workflows.has(qualifiedName);
  }

  /**
   * Get list of registered workflow names.
   */
  list(): string[] {
    return Array.from(this.workflows.keys());
  }

  /**
   * Start workflow with idempotency context.
   * Returns a handle to track workflow status and get result.
   *
   * IMPORTANT: All workflows use a standard `run(params)` entry point method.
   * The @Workflow decorator wraps the method with DBOS.workflow() which
   * expects this convention.
   */
  async start<TParams, TResult>(
    qualifiedName: string,
    params: TParams,
    idempotencyCtx: IdempotencyContext,
    options?: WorkflowStartOptions,
    context?: WorkflowExecutionContext,
  ): Promise<WorkflowHandle<TResult>> {
    if (idempotencyCtx.source === "time-window" && options?.workflowId === undefined) {
      return this.withTimeWindowLock(qualifiedName, idempotencyCtx, async () => {
        const workflowId = await resolveIdempotentWorkflowId(qualifiedName, idempotencyCtx);
        return this.start<TParams, TResult>(
          qualifiedName,
          params,
          idempotencyCtx,
          { ...options, workflowId },
          context,
        );
      });
    }

    const descriptor = this.getDescriptor(qualifiedName);

    const workflowID =
      options?.workflowId ?? (await resolveIdempotentWorkflowId(qualifiedName, idempotencyCtx));
    const requestHash = idempotencyCtx.source === "client" ? idempotencyCtx.requestHash : undefined;
    const requestTimestamp =
      idempotencyCtx.source === "time-window" ? idempotencyCtx.requestTimestamp : undefined;
    if (requestHash) {
      const existing = await DBOS.getWorkflowStatus(workflowID);
      if (existing) {
        assertMatchingRequestHash(existing.attributes, requestHash);
      }
    }
    const startParams = mapWorkflowStartOptions(workflowID, {
      ...options,
      ...(requestHash || requestTimestamp !== undefined
        ? {
            attributes: {
              ...options?.attributes,
              ...(requestHash ? { shopanaRequestHash: requestHash } : {}),
              ...(requestTimestamp !== undefined
                ? { shopanaRequestTimestamp: requestTimestamp }
                : {}),
            },
          }
        : {}),
    });

    // Cast to ConfiguredInstance with run method for DBOS.startWorkflow().
    // All BaseWorkflow/BaseSaga extend ConfiguredInstance and have a `run` method.
    const workflowInstance = descriptor.instance as ConfiguredInstance & {
      run: (params: TParams, context?: WorkflowExecutionContext) => Promise<TResult>;
    };

    const configuredWorkflow = DBOS.startWorkflow(workflowInstance, startParams);
    const handle = context
      ? await configuredWorkflow.run(params, context)
      : await configuredWorkflow.run(params);

    if (requestHash) {
      const status = await DBOS.getWorkflowStatus(workflowID);
      assertMatchingRequestHash(status?.attributes, requestHash);
    }

    return {
      workflowId: handle.workflowID ?? workflowID,
      getResult: () => handle.getResult(),
      getStatus: () => handle.getStatus(),
    };
  }

  /**
   * Execute workflow and wait for result.
   * Convenience method that starts workflow and awaits completion.
   */
  async run<TParams, TResult>(
    qualifiedName: string,
    params: TParams,
    idempotencyCtx: IdempotencyContext,
    options?: WorkflowStartOptions,
    context?: WorkflowExecutionContext,
  ): Promise<TResult> {
    const handle = await this.start<TParams, TResult>(
      qualifiedName,
      params,
      idempotencyCtx,
      options,
      context,
    );
    return handle.getResult();
  }

  /**
   * Get handle to existing workflow by ID.
   * Used to check status or get result of previously started workflow.
   */
  retrieve<TResult>(workflowId: string): WorkflowHandle<TResult> {
    const handle = DBOS.retrieveWorkflow<TResult>(workflowId);
    return {
      workflowId,
      getResult: () => handle.getResult(),
      getStatus: () => handle.getStatus(),
    };
  }

  private async withTimeWindowLock<TResult>(
    workflowName: string,
    context: Extract<IdempotencyContext, { source: "time-window" }>,
    work: () => Promise<TResult>,
  ): Promise<TResult> {
    const lockIdentity = buildIdempotencyKey(workflowName, {
      ...context,
      requestTimestamp: 0,
    });

    return this.lockDatabase.begin(async (transaction) => {
      // Keep the lock until DBOS has durably accepted the selected workflow ID.
      // Releasing it after status lookup would reintroduce a bucket-boundary TOCTOU race.
      await transaction`
        SELECT pg_advisory_xact_lock(hashtextextended(${lockIdentity}, 0))
      `;
      return work();
    }) as Promise<TResult>;
  }
}

async function resolveIdempotentWorkflowId(
  workflowName: string,
  context: IdempotencyContext,
): Promise<string> {
  const workflowId = buildIdempotencyKey(workflowName, context);
  if (context.source !== "time-window" || context.requestTimestamp < context.windowMs) {
    return workflowId;
  }

  const current = await DBOS.getWorkflowStatus(workflowId);
  if (current) {
    return workflowId;
  }

  const previousWorkflowId = buildIdempotencyKey(workflowName, {
    ...context,
    requestTimestamp: context.requestTimestamp - context.windowMs,
  });
  const previous = await DBOS.getWorkflowStatus(previousWorkflowId);
  const previousTimestamp = previous?.attributes?.shopanaRequestTimestamp;
  if (
    typeof previousTimestamp === "number" &&
    context.requestTimestamp >= previousTimestamp &&
    context.requestTimestamp - previousTimestamp < context.windowMs
  ) {
    return previousWorkflowId;
  }

  return workflowId;
}

function assertMatchingRequestHash(
  attributes: Record<string, unknown> | undefined,
  requestHash: string,
): void {
  if (attributes?.shopanaRequestHash !== requestHash) {
    throw new IdempotencyConflictError();
  }
}

function mapWorkflowStartOptions(
  workflowID: string,
  options?: WorkflowStartOptions,
): DBOSStartWorkflowParams {
  const enqueueOptions = mapEnqueueOptions(options);

  if (options?.duplicationPolicy === "return-existing") {
    if (!options.queueName) {
      throw new Error('Workflow duplicationPolicy "return-existing" requires queueName');
    }

    if (!enqueueOptions?.deduplicationID) {
      throw new Error(
        'Workflow duplicationPolicy "return-existing" requires enqueueOptions.deduplicationID',
      );
    }
  }

  if (enqueueOptions?.queuePartitionKey && enqueueOptions.deduplicationID) {
    throw new Error(
      "Workflow enqueueOptions.deduplicationID cannot be used with queuePartitionKey",
    );
  }

  return {
    workflowID,
    ...(options?.queueName !== undefined && { queueName: options.queueName }),
    ...(options?.timeoutMS !== undefined && { timeoutMS: options.timeoutMS }),
    ...(options?.queueName !== undefined && enqueueOptions !== undefined && { enqueueOptions }),
    ...(options?.duplicationPolicy !== undefined && {
      duplicationPolicy: options.duplicationPolicy,
    }),
    ...(options?.attributes !== undefined && {
      workflowAttributes: options.attributes,
    }),
  };
}

function mapEnqueueOptions(
  options?: WorkflowStartOptions,
): WorkflowQueueEnqueueOptions | undefined {
  const enqueueOptions = options?.enqueueOptions;
  if (!enqueueOptions) {
    return undefined;
  }

  const mapped: WorkflowQueueEnqueueOptions = {
    ...(enqueueOptions.queuePartitionKey !== undefined && {
      queuePartitionKey: enqueueOptions.queuePartitionKey,
    }),
    ...(enqueueOptions.deduplicationID !== undefined && {
      deduplicationID: enqueueOptions.deduplicationID,
    }),
    ...(enqueueOptions.priority !== undefined && {
      priority: enqueueOptions.priority,
    }),
    ...(enqueueOptions.delaySeconds !== undefined && {
      delaySeconds: enqueueOptions.delaySeconds,
    }),
  };

  return Object.keys(mapped).length > 0 ? mapped : undefined;
}
