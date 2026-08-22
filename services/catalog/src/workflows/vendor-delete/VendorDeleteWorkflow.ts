import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  ChildWorkflowStep,
  DBOS,
  InjectBroker,
  Policy,
  ServiceBroker,
  Workflow,
} from "@shopana/shared-kernel";
import { Kernel } from "../../kernel/Kernel.js";
import type { RunScriptContext } from "../../kernel/types.js";
import { TransactionalStep } from "../CatalogTransactionalStep.js";
import { VendorDeleteScript } from "./scripts/index.js";
import type { VendorDeleteInput, VendorDeleteResult } from "./dto/index.js";

@Injectable()
export class VendorDeleteWorkflow extends BrokerWorkflows<VendorDeleteInput, VendorDeleteResult> {
  constructor(
    @InjectBroker("catalog") broker: ServiceBroker,
    private readonly kernel: Kernel,
  ) {
    super(broker);
  }

  get transactionKernel(): Kernel {
    return this.kernel;
  }

  @Workflow("vendorDelete")
  @Policy<VendorDeleteInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  run(input: VendorDeleteInput): Promise<VendorDeleteResult> {
    const context: RunScriptContext = { ...input.context };
    return this.kernel.runWithWorkflowContext(context, async () => {
      const result = await this.remove(input, context);
      if (!result.deletedVendorId || result.userErrors.length > 0) {
        return { deletedVendorId: null, userErrors: result.userErrors };
      }
      await this.emitDeleted(input);
      return { deletedVendorId: result.deletedVendorId, userErrors: [] };
    });
  }

  @TransactionalStep()
  private remove(input: VendorDeleteInput, context: RunScriptContext) {
    return this.kernel.runScript(VendorDeleteScript, { id: input.vendorId }, context);
  }

  @ChildWorkflowStep()
  private async emitDeleted(input: VendorDeleteInput): Promise<void> {
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "vendorDeleted",
        payload: {
          storeId: input.context.storeId,
          vendorId: input.vendorId,
          audit: lifecycleAudit("DELETE", "vendorDelete", input.context.storeId, input.vendorId),
        },
        context: {
          organizationId: input.context.organizationId,
          userId: input.context.userId,
        },
        subject: { type: "vendor", id: input.vendorId },
        actor: input.context.userId ? { type: "user", id: input.context.userId } : undefined,
        emitKey: `vendor:${input.vendorId}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitVendorDeleted",
        callId: input.vendorId,
        organizationId: input.context.organizationId,
      },
    );
  }
}

function lifecycleAudit(action: "DELETE", command: string, storeId: string, vendorId: string) {
  return {
    kind: "aggregate-mutation" as const,
    schemaVersion: 1 as const,
    storeId,
    action,
    command,
    aggregate: { type: "vendor", id: vendorId },
    operations: [
      {
        position: 0,
        type: command,
        action,
        target: { type: "vendor", id: vendorId },
        changes: [],
      },
    ],
  };
}
