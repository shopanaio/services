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
import type {
  AdminOrderBulkTarget,
  AdminOrderExternalEffect,
} from "../../repositories/admin/AdminOrderCommandRepository.js";

abstract class AdminOrderCommandWorkflowBase extends BrokerWorkflows<
  AdminOrderCommandInput,
  AdminOrderCommandResult
> {
  protected constructor(
    broker: ServiceBroker,
    protected readonly repository: Repository,
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
    if (result.operationId) {
      if (this.command === "ordersBulkAction") {
        return this.executeBulk(input, result, workflowId);
      }
      try {
        const effects = await this.loadExternalEffects(input, result);
        for (let index = 0; index < effects.length; index += 1) {
          const effect = effects[index]!;
          try {
            const response = await this.performExternalEffect(effect);
            await this.recordAttempt(
              input.context.storeId,
              result.operationId,
              index + 1,
              effect,
              response,
            );
          } catch (error) {
            await this.recordAttempt(
              input.context.storeId,
              result.operationId,
              index + 1,
              effect,
              null,
              error,
            );
            throw error;
          }
        }
        await this.finishOperation(input, result, true);
      } catch (error) {
        await this.finishOperation(input, result, false, error);
        throw error;
      }
    }
    return result;
  }

  private async executeBulk(
    input: AdminOrderCommandInput,
    result: AdminOrderCommandResult,
    workflowId: string,
  ): Promise<AdminOrderCommandResult> {
    if (!result.operationId) throw new Error("ORDER_BULK_OPERATION_MISSING");
    const targets = await this.loadBulkTargets(input);
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
      }
      await this.updateProgress(
        input.context.storeId,
        result.operationId,
        index + 1,
        targets.length,
      );
    }
    await this.finishOperation(input, result, true);
    return result;
  }

  @TransactionalStep({
    txManager: (self: AdminOrderCommandWorkflowBase) => self.repository.txManager,
    bridge: (self: AdminOrderCommandWorkflowBase) => self.repository.dbosTransactionBridge,
  })
  private loadExternalEffects(input: AdminOrderCommandInput, result: AdminOrderCommandResult) {
    return this.repository.adminCommand.externalEffects(this.command, input, result);
  }

  @TransactionalStep({
    txManager: (self: AdminOrderCommandWorkflowBase) => self.repository.txManager,
    bridge: (self: AdminOrderCommandWorkflowBase) => self.repository.dbosTransactionBridge,
  })
  private loadBulkTargets(input: AdminOrderCommandInput) {
    return this.repository.adminCommand.bulkTargets(input);
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
    return this.repository.adminCommand.updateOperationProgress(
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
    return this.repository.adminCommand.execute(this.command, input, workflowId);
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
    return this.repository.adminCommand.recordOperationAttempt(
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
  private finishOperation(
    input: AdminOrderCommandInput,
    result: AdminOrderCommandResult,
    succeeded: boolean,
    error?: unknown,
  ) {
    return this.repository.adminCommand.completeOperation(
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
) => AdminOrderCommandWorkflowBase;

function createAdminCommandWorkflow(command: AdminOrderCommandName): AdminCommandWorkflowProvider {
  @Injectable()
  class AdminCommandWorkflow extends AdminOrderCommandWorkflowBase {
    constructor(@InjectBroker("order") broker: ServiceBroker, repository: Repository) {
      super(broker, repository, command);
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
    publicInput = { id: target.id, expectedVersion: target.version, idempotencyKey };
  } else if (action === "ADD_TAGS" || action === "REMOVE_TAGS") {
    command = "orderTagsUpdate";
    const requested = Array.isArray(parent.input.tags)
      ? parent.input.tags.filter((tag): tag is string => typeof tag === "string")
      : [];
    const tags =
      action === "ADD_TAGS"
        ? [...new Set([...target.tags, ...requested])]
        : target.tags.filter((tag) => !requested.includes(tag));
    publicInput = { id: target.id, expectedVersion: target.version, idempotencyKey, tags };
  } else if (action === "CANCEL") {
    command = "orderCancel";
    publicInput = {
      id: target.id,
      expectedVersion: target.version,
      idempotencyKey,
      reasonCode: parent.input.reasonCode ?? "MERCHANT_DECISION",
      restock: true,
    };
  } else if (action === "REQUEST_INTEGRATION_SYNC") {
    command = "orderIntegrationSyncRequest";
    publicInput = {
      orderId: target.id,
      expectedVersion: target.version,
      idempotencyKey,
      integrationLinkId: parent.input.integrationLinkId,
    };
  } else {
    throw new Error("ORDER_BULK_ACTION_INVALID");
  }
  return { command, input: { context: parent.context, input: publicInput } };
}
