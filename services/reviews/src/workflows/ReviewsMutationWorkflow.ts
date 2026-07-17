import {
  BrokerWorkflows,
  ServiceBroker,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import type { RunScriptContext } from "../kernel/types.js";
import {
  ProductQuestionSummaryRefreshScript,
  ProductReviewSummaryRefreshScript,
} from "../scripts/index.js";
import type { ReviewsMutationWorkflowContext } from "./dto/index.js";

export abstract class ReviewsMutationWorkflow extends BrokerWorkflows {
  protected constructor(broker: ServiceBroker) {
    super(broker);
  }

  protected get kernel(): Kernel {
    return Kernel.getInstance();
  }

  protected toScriptContext(
    context: ReviewsMutationWorkflowContext
  ): RunScriptContext {
    return {
      storeId: context.storeId,
      organizationId: context.organizationId,
      locale: context.locale,
      userId: context.userId,
      requestId: context.requestId,
    };
  }

  @WorkflowStep({
    name: "refreshProductReviewSummary",
    retry: {
      maxAttempts: 5,
      intervalSeconds: 1,
      backoffRate: 2,
    },
  })
  protected stepRefreshProductReviewSummary(input: {
    context: ReviewsMutationWorkflowContext;
    productId: string;
  }): Promise<void> {
    return this.kernel.runScript(
      ProductReviewSummaryRefreshScript,
      { productId: input.productId },
      this.toScriptContext(input.context)
    );
  }

  @WorkflowStep({
    name: "refreshProductQuestionSummary",
    retry: {
      maxAttempts: 5,
      intervalSeconds: 1,
      backoffRate: 2,
    },
  })
  protected stepRefreshProductQuestionSummary(input: {
    context: ReviewsMutationWorkflowContext;
    productId: string;
  }): Promise<void> {
    return this.kernel.runScript(
      ProductQuestionSummaryRefreshScript,
      { productId: input.productId },
      this.toScriptContext(input.context)
    );
  }
}
