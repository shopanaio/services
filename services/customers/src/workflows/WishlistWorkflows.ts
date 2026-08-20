import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  InjectBroker,
  type ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import type { RunScriptContext } from "../kernel/types.js";
import {
  WishlistCreateScript,
  WishlistDeleteScript,
  WishlistProductAddScript,
  WishlistProductRemoveScript,
  WishlistUpdateScript,
} from "../scripts/wishlist/index.js";
import type {
  WishlistCreateWorkflowInput,
  WishlistCreateWorkflowResult,
  WishlistDeleteWorkflowInput,
  WishlistDeleteWorkflowResult,
  WishlistProductAddWorkflowInput,
  WishlistProductAddWorkflowResult,
  WishlistProductRemoveWorkflowInput,
  WishlistProductRemoveWorkflowResult,
  WishlistUpdateWorkflowInput,
  WishlistUpdateWorkflowResult,
  WishlistWorkflowContext,
} from "./dto/index.js";

abstract class WishlistWorkflow extends BrokerWorkflows {
  protected constructor(broker: ServiceBroker) {
    super(broker);
  }

  protected get kernel(): Kernel {
    return Kernel.getInstance();
  }

  protected scriptContext(context: WishlistWorkflowContext): RunScriptContext {
    return {
      organizationId: context.organizationId,
      storeId: context.storeId,
      locale: context.locale,
      requestId: context.requestId,
    };
  }
}

@Injectable()
export class WishlistCreateWorkflow extends WishlistWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("wishlistCreate", { idempotencyStrategy: "client" })
  run(input: WishlistCreateWorkflowInput): Promise<WishlistCreateWorkflowResult> {
    return this.stepCreate(input);
  }

  @WorkflowStep()
  private stepCreate(input: WishlistCreateWorkflowInput) {
    return this.kernel.runScript(
      WishlistCreateScript,
      { ...input.params, customerId: input.context.customerId },
      this.scriptContext(input.context),
    );
  }
}

@Injectable()
export class WishlistUpdateWorkflow extends WishlistWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("wishlistUpdate", { idempotencyStrategy: "client" })
  run(input: WishlistUpdateWorkflowInput): Promise<WishlistUpdateWorkflowResult> {
    return this.stepUpdate(input);
  }

  @WorkflowStep()
  private stepUpdate(input: WishlistUpdateWorkflowInput) {
    return this.kernel.runScript(
      WishlistUpdateScript,
      { ...input.params, customerId: input.context.customerId },
      this.scriptContext(input.context),
    );
  }
}

@Injectable()
export class WishlistDeleteWorkflow extends WishlistWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("wishlistDelete", { idempotencyStrategy: "client" })
  run(input: WishlistDeleteWorkflowInput): Promise<WishlistDeleteWorkflowResult> {
    return this.stepDelete(input);
  }

  @WorkflowStep()
  private stepDelete(input: WishlistDeleteWorkflowInput) {
    return this.kernel.runScript(
      WishlistDeleteScript,
      { ...input.params, customerId: input.context.customerId },
      this.scriptContext(input.context),
    );
  }
}

@Injectable()
export class WishlistProductAddWorkflow extends WishlistWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("wishlistProductAdd", { idempotencyStrategy: "client" })
  run(input: WishlistProductAddWorkflowInput): Promise<WishlistProductAddWorkflowResult> {
    return this.stepAdd(input);
  }

  @WorkflowStep()
  private stepAdd(input: WishlistProductAddWorkflowInput) {
    return this.kernel.runScript(
      WishlistProductAddScript,
      { ...input.params, customerId: input.context.customerId },
      this.scriptContext(input.context),
    );
  }
}

@Injectable()
export class WishlistProductRemoveWorkflow extends WishlistWorkflow {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("wishlistProductRemove", { idempotencyStrategy: "client" })
  run(input: WishlistProductRemoveWorkflowInput): Promise<WishlistProductRemoveWorkflowResult> {
    return this.stepRemove(input);
  }

  @WorkflowStep()
  private stepRemove(input: WishlistProductRemoveWorkflowInput) {
    return this.kernel.runScript(
      WishlistProductRemoveScript,
      { ...input.params, customerId: input.context.customerId },
      this.scriptContext(input.context),
    );
  }
}
