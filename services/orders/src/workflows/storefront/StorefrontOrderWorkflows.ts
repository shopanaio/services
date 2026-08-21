import { Injectable } from "@nestjs/common";
import {
  InjectBroker,
  type ServiceBroker,
  Workflow,
} from "@shopana/shared-kernel";
import type {
  AdminOrderCommandInput,
  AdminOrderCommandResult,
} from "../../domain/admin/AdminOrderCommandContracts.js";
import { AdminOrderCommandService } from "../../application/admin/AdminOrderCommandService.js";
import { Repository } from "../../repositories/Repository.js";
import { AdminOrderCommandWorkflowBase } from "../admin/AdminOrderCommandWorkflows.js";

/**
 * Customer-scoped post-order commands. The broker action builds the admin
 * command input with a CUSTOMER actor, and the command repository verifies
 * `order.customer_id` against that actor under the same row lock it mutates,
 * so ownership, the expected revision and the state machine are all checked in
 * one transaction. These workflows therefore only reuse the admin durable
 * orchestration and add no read of their own.
 */
@Injectable()
export class CancelOrderFromStorefrontWorkflow extends AdminOrderCommandWorkflowBase {
  constructor(
    @InjectBroker("order") broker: ServiceBroker,
    repository: Repository,
    commandService: AdminOrderCommandService,
  ) {
    super(broker, repository, commandService, "orderCancel");
  }

  @Workflow("cancelOrderFromStorefront", { idempotencyStrategy: "content" })
  async run(input: AdminOrderCommandInput): Promise<AdminOrderCommandResult> {
    return this.execute(input);
  }
}

@Injectable()
export class CreateOrderReturnRequestFromStorefrontWorkflow extends AdminOrderCommandWorkflowBase {
  constructor(
    @InjectBroker("order") broker: ServiceBroker,
    repository: Repository,
    commandService: AdminOrderCommandService,
  ) {
    super(broker, repository, commandService, "orderReturnCreate");
  }

  @Workflow("createOrderReturnRequestFromStorefront", { idempotencyStrategy: "content" })
  async run(input: AdminOrderCommandInput): Promise<AdminOrderCommandResult> {
    return this.execute(input);
  }
}
