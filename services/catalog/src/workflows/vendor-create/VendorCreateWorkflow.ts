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
import { VendorCreateScript } from "./scripts/index.js";
import type { VendorCreateInput, VendorCreateResult } from "./dto/index.js";

@Injectable()
export class VendorCreateWorkflow extends BrokerWorkflows<VendorCreateInput, VendorCreateResult> {
  constructor(
    @InjectBroker("catalog") broker: ServiceBroker,
    private readonly kernel: Kernel,
  ) {
    super(broker);
  }

  get transactionKernel(): Kernel {
    return this.kernel;
  }

  @Workflow("vendorCreate")
  @Policy<VendorCreateInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  run(input: VendorCreateInput): Promise<VendorCreateResult> {
    const context: RunScriptContext = { ...input.context };
    return this.kernel.runWithWorkflowContext(context, async () => {
      const result = await this.create(input, context);
      if (!result.vendor || result.userErrors.length > 0) {
        return { vendor: null, userErrors: result.userErrors };
      }
      await this.emitCreated(input, result.vendor.id);
      return { vendor: { id: result.vendor.id }, userErrors: [] };
    });
  }

  @TransactionalStep()
  private create(input: VendorCreateInput, context: RunScriptContext) {
    return this.kernel.runScript(VendorCreateScript, { name: input.name }, context);
  }

  @ChildWorkflowStep()
  private async emitCreated(input: VendorCreateInput, vendorId: string): Promise<void> {
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "vendorCreated",
        payload: {
          storeId: input.context.storeId,
          vendorId,
          audit: lifecycleAudit("CREATE", "vendorCreate", input.context.storeId, vendorId),
        },
        context: {
          organizationId: input.context.organizationId,
          userId: input.context.userId,
        },
        subject: { type: "vendor", id: vendorId },
        actor: input.context.userId ? { type: "user", id: input.context.userId } : undefined,
        emitKey: `vendor:${vendorId}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitVendorCreated",
        callId: vendorId,
        organizationId: input.context.organizationId,
      },
    );
  }
}

function lifecycleAudit(action: "CREATE", command: string, storeId: string, vendorId: string) {
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
