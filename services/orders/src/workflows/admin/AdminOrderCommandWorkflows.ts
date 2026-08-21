import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  DBOS,
  InjectBroker,
  Policy,
  type ServiceBroker,
  TransactionalStep,
  Workflow,
  WorkflowStep,
  type WorkflowExecutionContext,
} from "@shopana/shared-kernel";
import {
  adminOrderCommandInputSchema,
  adminOrderCommandNames,
  parseAdminOrderPublicInput,
  sensitiveAdminOrderCommands,
  type AdminOrderCommandInput,
  type AdminOrderCommandName,
  type AdminOrderCommandResult,
} from "../../domain/admin/AdminOrderCommandContracts.js";
import { Repository } from "../../repositories/Repository.js";
import { orderNotificationSnapshot } from "../../domain/order/customerNotification.js";
import type { AdminOrderExternalEffect } from "../../application/admin/AdminOrderCommandPorts.js";
import type { AdminOrderBulkTarget } from "../../application/admin/AdminOrderBulkSelection.js";
import type { EventEmitResult } from "@shopana/events";
import { AdminOrderCommandService } from "../../application/admin/AdminOrderCommandService.js";
import { parseAdminOrderBulkSelection } from "../../application/admin/AdminOrderBulkSelection.js";
import { executeAdminOrderOperation } from "../../application/admin/AdminOrderOperationCoordinator.js";

export abstract class AdminOrderCommandWorkflowBase extends BrokerWorkflows<
  AdminOrderCommandInput,
  AdminOrderCommandResult
> {
  protected constructor(
    broker: ServiceBroker,
    protected readonly repository: Repository,
    private readonly commandService: AdminOrderCommandService,
    protected readonly command: AdminOrderCommandName,
  ) {
    super(broker);
  }

  protected async execute(rawInput: AdminOrderCommandInput): Promise<AdminOrderCommandResult> {
    const input = adminOrderCommandInputSchema.parse(rawInput);
    parseAdminOrderPublicInput(this.command, input.input);
    const workflowId = DBOS.workflowID;
    if (!workflowId) throw new Error("ORDER_ADMIN_WORKFLOW_CONTEXT_MISSING");
    const result = await this.commit(input, workflowId);
    let completedResult: AdminOrderCommandResult = result;
    if (result.operationId) {
      if (this.command === "ordersBulkAction") {
        return this.executeBulk(input, result, workflowId);
      }
      completedResult = await executeAdminOrderOperation({
        result,
        loadEffects: () => this.loadExternalEffects(input, result),
        performEffect: (effect) => this.performExternalEffect(effect),
        recordAttempt: (index, effect, response, error) =>
          this.recordAttempt(
            input.context.storeId,
            result.operationId!,
            index,
            effect,
            response,
            error,
          ),
        applyEffect: (effect, response) =>
          this.applyExternalEffectResult(input, result, effect, response),
        finish: (succeeded, error) => this.finishOperation(input, result, succeeded, error),
        publish: (completed) => this.publishCommandEvent(input, completed, workflowId),
      });
    } else {
      await this.publishCommandEvent(input, result, workflowId);
    }
    await this.publishCustomerCancelledEvent(input, completedResult, workflowId);
    return completedResult;
  }

  @WorkflowStep()
  private async publishCustomerCancelledEvent(
    input: AdminOrderCommandInput,
    result: AdminOrderCommandResult,
    workflowId: string,
  ): Promise<void> {
    if (this.command !== "orderCancel" || input.input.notifyCustomer !== true) return;
    if (!result.orderId) return;
    const facts = await this.repository.order.findNotificationFacts(
      input.context.storeId,
      result.orderId,
    );
    if (!facts?.customerId) return;
    const occurredAt = new Date().toISOString();
    await this.broker.runWorkflow<EventEmitResult>(
      "events.emit",
      {
        eventType: "orderCancelled",
        payload: {
          schemaVersion: 1,
          orderId: facts.orderId,
          orderRevision: 1,
          storeId: facts.storeId,
          customerId: facts.customerId,
          currencyCode: facts.currencyCode,
          totalAmountMinor: facts.totalAmountMinor,
          createdAt: facts.createdAt,
          occurredAt,
          cancelledAt: occurredAt,
          notification: orderNotificationSnapshot(facts, { cancelledAt: occurredAt }),
        },
        context: {
          organizationId: input.context.organizationId,
          correlationId: input.context.correlationId,
        },
        subject: { type: "order", id: facts.orderId },
        actor: { type: "service" },
        emitKey: `order:${facts.orderId}`,
      },
      {
        source: "workflow",
        organizationId: input.context.organizationId,
        workflowId,
        stepId: "emit:orderCancelled",
        callId: facts.orderId,
      },
    );
  }

  private async executeBulk(
    input: AdminOrderCommandInput,
    result: AdminOrderCommandResult,
    workflowId: string,
  ): Promise<AdminOrderCommandResult> {
    if (!result.operationId) throw new Error("ORDER_BULK_OPERATION_MISSING");
    const targets = await this.loadBulkTargets(input);
    const bulkResults: NonNullable<AdminOrderCommandResult["bulkResults"]>[number][] = [];
    await this.updateProgress(input.context.storeId, result.operationId, 0, targets.length);
    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index]!;
      const child = bulkChild(input, target);
      const effect: AdminOrderExternalEffect = {
        route: `${child.command}:${target.id}`,
        params: child.input,
      };
      try {
        const response = await this.runBulkChild(child.command, child.input, workflowId, target.id);
        bulkResults.push({
          orderId: target.id,
          success: true,
          orderVersion: response.orderVersion,
          errorCode: null,
        });
        await this.recordAttempt(
          input.context.storeId,
          result.operationId,
          index + 1,
          effect,
          response,
        );
      } catch (error) {
        // Domain conflicts are explicit per-order partial results and are never retried by the coordinator.
        await this.recordAttempt(
          input.context.storeId,
          result.operationId,
          index + 1,
          effect,
          null,
          error,
        );
        bulkResults.push({
          orderId: target.id,
          success: false,
          orderVersion: null,
          errorCode: error instanceof Error ? error.message : "ORDER_BULK_CHILD_FAILED",
        });
      }
      await this.updateProgress(
        input.context.storeId,
        result.operationId,
        index + 1,
        targets.length,
      );
    }
    await this.finishOperation(input, result, true);
    await this.publishCommandEvent(input, result, workflowId);
    return { ...result, bulkResults };
  }

  @TransactionalStep({
    txManager: (self: AdminOrderCommandWorkflowBase) => self.repository.txManager,
    bridge: (self: AdminOrderCommandWorkflowBase) => self.repository.dbosTransactionBridge,
  })
  private loadExternalEffects(input: AdminOrderCommandInput, result: AdminOrderCommandResult) {
    return this.repository.admin.provider.externalEffects(this.command, input, result);
  }

  @TransactionalStep({
    txManager: (self: AdminOrderCommandWorkflowBase) => self.repository.txManager,
    bridge: (self: AdminOrderCommandWorkflowBase) => self.repository.dbosTransactionBridge,
  })
  private loadBulkTargets(input: AdminOrderCommandInput) {
    const selection = parseAdminOrderBulkSelection(input.input);
    return this.repository.admin.bulkSelection.findTargets(input.context.storeId, selection);
  }

  @WorkflowStep()
  private runBulkChild(
    command: AdminOrderCommandName,
    input: AdminOrderCommandInput,
    workflowId: string,
    orderId: string,
  ) {
    return this.broker.runWorkflow<AdminOrderCommandResult, AdminOrderCommandInput>(
      `order.${command}`,
      input,
      {
        source: "workflow",
        organizationId: input.context.organizationId,
        workflowId,
        stepId: "bulkChild",
        callId: orderId,
      },
    );
  }

  @TransactionalStep({
    txManager: (self: AdminOrderCommandWorkflowBase) => self.repository.txManager,
    bridge: (self: AdminOrderCommandWorkflowBase) => self.repository.dbosTransactionBridge,
  })
  private updateProgress(storeId: string, operationId: string, current: number, total: number) {
    return this.repository.admin.operation.updateOperationProgress(
      storeId,
      operationId,
      current,
      total,
    );
  }

  @TransactionalStep({
    txManager: (self: AdminOrderCommandWorkflowBase) => self.repository.txManager,
    bridge: (self: AdminOrderCommandWorkflowBase) => self.repository.dbosTransactionBridge,
  })
  private commit(input: AdminOrderCommandInput, workflowId: string) {
    return this.commandService.execute(this.command, input, workflowId);
  }

  /**
   * Each provider call is checkpointed independently from the aggregate write.
   * Family-specific integrations consume the durable operation in later slices;
   * commands without a configured provider route complete as local operations.
   */
  @WorkflowStep()
  private performExternalEffect(effect: AdminOrderExternalEffect): Promise<unknown> {
    return this.broker.call(effect.route, effect.params);
  }

  @WorkflowStep()
  private publishCommandEvent(
    input: AdminOrderCommandInput,
    result: AdminOrderCommandResult,
    workflowId: string,
  ): Promise<EventEmitResult> {
    const subjectId = result.orderId ?? result.resourceId ?? result.operationId;
    if (!subjectId) throw new Error("ORDER_COMMAND_EVENT_SUBJECT_MISSING");
    return this.broker.runWorkflow<EventEmitResult>(
      "events.emit",
      {
        eventType: `order.admin.${this.command}`,
        payload: {
          schemaVersion: 1,
          organizationId: input.context.organizationId,
          storeId: input.context.storeId,
          command: this.command,
          orderId: result.orderId,
          orderVersion: result.orderVersion,
          resourceId: result.resourceId,
          operationId: result.operationId,
          deleted: result.deleted,
        },
        context: {
          organizationId: input.context.organizationId,
          correlationId: input.context.correlationId,
        },
        subject: { type: result.orderId ? "order" : "order-operation", id: subjectId },
        actor: { type: "service" },
        emitKey: `order:${subjectId}`,
      },
      {
        source: "workflow",
        organizationId: input.context.organizationId,
        workflowId,
        stepId: `emit:${this.command}`,
        callId: subjectId,
      },
    );
  }

  @TransactionalStep({
    txManager: (self: AdminOrderCommandWorkflowBase) => self.repository.txManager,
    bridge: (self: AdminOrderCommandWorkflowBase) => self.repository.dbosTransactionBridge,
  })
  private recordAttempt(
    storeId: string,
    operationId: string,
    attemptNumber: number,
    effect: AdminOrderExternalEffect,
    response: unknown,
    error?: unknown,
  ) {
    return this.repository.admin.provider.recordOperationAttempt(
      storeId,
      operationId,
      attemptNumber,
      effect,
      response,
      error,
    );
  }

  @TransactionalStep({
    txManager: (self: AdminOrderCommandWorkflowBase) => self.repository.txManager,
    bridge: (self: AdminOrderCommandWorkflowBase) => self.repository.dbosTransactionBridge,
  })
  private applyExternalEffectResult(
    input: AdminOrderCommandInput,
    result: AdminOrderCommandResult,
    effect: AdminOrderExternalEffect,
    response: unknown,
  ) {
    return this.repository.admin.provider.applyExternalEffectResult(
      this.command,
      input,
      result,
      effect,
      response,
    );
  }

  @TransactionalStep({
    txManager: (self: AdminOrderCommandWorkflowBase) => self.repository.txManager,
    bridge: (self: AdminOrderCommandWorkflowBase) => self.repository.dbosTransactionBridge,
  })
  private finishOperation(
    input: AdminOrderCommandInput,
    result: AdminOrderCommandResult,
    succeeded: boolean,
    error?: unknown,
  ) {
    return this.repository.admin.operation.completeOperation(
      this.command,
      input,
      result,
      succeeded,
      error,
    );
  }
}

type AdminCommandWorkflowProvider = new (
  broker: ServiceBroker,
  repository: Repository,
  commandService: AdminOrderCommandService,
) => AdminOrderCommandWorkflowBase;

function createAdminCommandWorkflow(command: AdminOrderCommandName): AdminCommandWorkflowProvider {
  @Injectable()
  class AdminCommandWorkflow extends AdminOrderCommandWorkflowBase {
    constructor(
      @InjectBroker("order") broker: ServiceBroker,
      repository: Repository,
      commandService: AdminOrderCommandService,
    ) {
      super(broker, repository, commandService, command);
    }

    @Workflow(command, { idempotencyStrategy: "client" })
    @Policy<AdminOrderCommandInput>({
      resource: "store.data",
      action: sensitiveAdminOrderCommands.has(command) ? "admin" : "write",
      organizationId: (_self, input) => input.context.organizationId,
      domain: (_self, input) => `store:${input.context.storeId}`,
    })
    run(
      input: AdminOrderCommandInput,
      workflowContext?: WorkflowExecutionContext,
    ): Promise<AdminOrderCommandResult> {
      if (!workflowContext) throw new Error("Workflow authorization context is required");
      return this.execute(input);
    }
  }

  Object.defineProperty(AdminCommandWorkflow, "name", {
    value: `${command[0]!.toUpperCase()}${command.slice(1)}Workflow`,
  });
  return AdminCommandWorkflow;
}

export const adminOrderCommandWorkflowProviders = adminOrderCommandNames.map(
  createAdminCommandWorkflow,
);

function bulkChild(
  parent: AdminOrderCommandInput,
  target: AdminOrderBulkTarget,
): Readonly<{ command: AdminOrderCommandName; input: AdminOrderCommandInput }> {
  const action = String(parent.input.action);
  const idempotencyKey = `${String(parent.input.idempotencyKey)}:${target.id}`;
  let command: AdminOrderCommandName;
  let publicInput: Record<string, unknown>;
  if (action === "ARCHIVE" || action === "UNARCHIVE") {
    command = action === "ARCHIVE" ? "orderArchive" : "orderUnarchive";
    publicInput = { id: target.id, idempotencyKey };
  } else if (action === "ADD_TAGS" || action === "REMOVE_TAGS") {
    command = "orderTagsUpdate";
    const requested = Array.isArray(parent.input.tags)
      ? parent.input.tags.filter((tag): tag is string => typeof tag === "string")
      : [];
    const tags =
      action === "ADD_TAGS"
        ? [...new Set([...target.tags, ...requested])]
        : target.tags.filter((tag) => !requested.includes(tag));
    publicInput = { id: target.id, idempotencyKey, tags };
  } else if (action === "CANCEL") {
    command = "orderCancel";
    publicInput = {
      id: target.id,

      idempotencyKey,
      reasonCode: parent.input.reasonCode ?? "MERCHANT_DECISION",
      restock: true,
    };
  } else if (action === "REQUEST_INTEGRATION_SYNC") {
    command = "orderIntegrationSyncRequest";
    publicInput = {
      orderId: target.id,

      idempotencyKey,
      integrationLinkId: parent.input.integrationLinkId,
    };
  } else {
    throw new Error("ORDER_BULK_ACTION_INVALID");
  }
  return { command, input: { context: parent.context, input: publicInput } };
}
