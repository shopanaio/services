import { Injectable } from "@nestjs/common";
import {
  InjectBroker,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import {
  ContentExternalReferenceUpdateScript,
  ContentRedactScript,
  ContentReportUpdateScript,
  ContentRevisionRestoreScript,
  ModerationCaseUpdateScript,
  QuestionSubscriptionUpdateScript,
  ReviewRequestUpdateScript,
  StoreConfigurationUpdateScript,
} from "../scripts/index.js";
import type {
  ContentExternalReferenceUpdateWorkflowInput,
  ContentExternalReferenceUpdateWorkflowResult,
  ContentRedactWorkflowInput,
  ContentRedactWorkflowResult,
  ContentReportUpdateWorkflowInput,
  ContentReportUpdateWorkflowResult,
  ContentRevisionRestoreWorkflowInput,
  ContentRevisionRestoreWorkflowResult,
  ModerationCaseUpdateWorkflowInput,
  ModerationCaseUpdateWorkflowResult,
  QuestionSubscriptionUpdateWorkflowInput,
  QuestionSubscriptionUpdateWorkflowResult,
  ReviewsUpdateOperationResult,
  ReviewsUpdateOperationType,
  ReviewRequestUpdateWorkflowInput,
  ReviewRequestUpdateWorkflowResult,
  StoreConfigurationUpdateWorkflowInput,
  StoreConfigurationUpdateWorkflowResult,
} from "./dto/index.js";
import { ReviewsMutationWorkflow } from "./ReviewsMutationWorkflow.js";

abstract class EntityUpdateWorkflow extends ReviewsMutationWorkflow {
  protected constructor(broker: ServiceBroker) {
    super(broker);
  }

  protected operationResult(
    type: ReviewsUpdateOperationType,
    errors: ReviewsUpdateOperationResult["errors"]
  ): ReviewsUpdateOperationResult[] {
    return [{ type, applied: errors.length === 0, errors }];
  }
}

@Injectable()
export class StoreConfigurationUpdateWorkflow extends EntityUpdateWorkflow {
  constructor(@InjectBroker("reviews") broker: ServiceBroker) { super(broker); }

  @Workflow("storeConfigurationUpdate")
  async run(input: StoreConfigurationUpdateWorkflowInput): Promise<StoreConfigurationUpdateWorkflowResult> {
    const result = await this.stepUpdate(input);
    return { ...result, operationResults: this.operationResult("storeConfigurationUpdate", result.userErrors) };
  }

  @WorkflowStep()
  private stepUpdate(input: StoreConfigurationUpdateWorkflowInput) {
    return this.kernel.runScript(StoreConfigurationUpdateScript, input.params, this.toScriptContext(input.context));
  }
}

@Injectable()
export class QuestionSubscriptionUpdateWorkflow extends EntityUpdateWorkflow {
  constructor(@InjectBroker("reviews") broker: ServiceBroker) { super(broker); }

  @Workflow("productQuestionSubscriptionUpdate")
  async run(input: QuestionSubscriptionUpdateWorkflowInput): Promise<QuestionSubscriptionUpdateWorkflowResult> {
    const result = await this.stepUpdate(input);
    return { ...result, operationResults: this.operationResult("productQuestionSubscriptionUpdate", result.userErrors) };
  }

  @WorkflowStep()
  private stepUpdate(input: QuestionSubscriptionUpdateWorkflowInput) {
    return this.kernel.runScript(QuestionSubscriptionUpdateScript, input.params, this.toScriptContext(input.context));
  }
}

@Injectable()
export class ContentRedactWorkflow extends EntityUpdateWorkflow {
  constructor(@InjectBroker("reviews") broker: ServiceBroker) { super(broker); }

  @Workflow("contentRedact")
  async run(input: ContentRedactWorkflowInput): Promise<ContentRedactWorkflowResult> {
    const result = await this.stepUpdate(input);
    return { ...result, operationResults: this.operationResult("contentRedact", result.userErrors) };
  }

  @WorkflowStep()
  private stepUpdate(input: ContentRedactWorkflowInput) {
    return this.kernel.runScript(ContentRedactScript, input.params, this.toScriptContext(input.context));
  }
}

@Injectable()
export class ContentRevisionRestoreWorkflow extends EntityUpdateWorkflow {
  constructor(@InjectBroker("reviews") broker: ServiceBroker) { super(broker); }

  @Workflow("contentRevisionRestore")
  async run(input: ContentRevisionRestoreWorkflowInput): Promise<ContentRevisionRestoreWorkflowResult> {
    const result = await this.stepUpdate(input);
    return { ...result, operationResults: this.operationResult("contentRevisionRestore", result.userErrors) };
  }

  @WorkflowStep()
  private stepUpdate(input: ContentRevisionRestoreWorkflowInput) {
    return this.kernel.runScript(ContentRevisionRestoreScript, input.params, this.toScriptContext(input.context));
  }
}

@Injectable()
export class ReviewRequestUpdateWorkflow extends EntityUpdateWorkflow {
  constructor(@InjectBroker("reviews") broker: ServiceBroker) { super(broker); }

  @Workflow("reviewRequestUpdate")
  async run(input: ReviewRequestUpdateWorkflowInput): Promise<ReviewRequestUpdateWorkflowResult> {
    const result = await this.stepUpdate(input);
    return { ...result, operationResults: this.operationResult("reviewRequestUpdate", result.userErrors) };
  }

  @WorkflowStep()
  private stepUpdate(input: ReviewRequestUpdateWorkflowInput) {
    return this.kernel.runScript(ReviewRequestUpdateScript, input.params, this.toScriptContext(input.context));
  }
}

@Injectable()
export class ContentReportUpdateWorkflow extends EntityUpdateWorkflow {
  constructor(@InjectBroker("reviews") broker: ServiceBroker) { super(broker); }

  @Workflow("contentReportUpdate")
  async run(input: ContentReportUpdateWorkflowInput): Promise<ContentReportUpdateWorkflowResult> {
    const result = await this.stepUpdate(input);
    return { ...result, operationResults: this.operationResult("contentReportUpdate", result.userErrors) };
  }

  @WorkflowStep()
  private stepUpdate(input: ContentReportUpdateWorkflowInput) {
    return this.kernel.runScript(ContentReportUpdateScript, input.params, this.toScriptContext(input.context));
  }
}

@Injectable()
export class ModerationCaseUpdateWorkflow extends EntityUpdateWorkflow {
  constructor(@InjectBroker("reviews") broker: ServiceBroker) { super(broker); }

  @Workflow("moderationCaseUpdate")
  async run(input: ModerationCaseUpdateWorkflowInput): Promise<ModerationCaseUpdateWorkflowResult> {
    const result = await this.stepUpdate(input);
    return { ...result, operationResults: this.operationResult("moderationCaseUpdate", result.userErrors) };
  }

  @WorkflowStep()
  private stepUpdate(input: ModerationCaseUpdateWorkflowInput) {
    return this.kernel.runScript(ModerationCaseUpdateScript, input.params, this.toScriptContext(input.context));
  }
}

@Injectable()
export class ContentExternalReferenceUpdateWorkflow extends EntityUpdateWorkflow {
  constructor(@InjectBroker("reviews") broker: ServiceBroker) { super(broker); }

  @Workflow("contentExternalReferenceUpdate")
  async run(input: ContentExternalReferenceUpdateWorkflowInput): Promise<ContentExternalReferenceUpdateWorkflowResult> {
    const result = await this.stepUpdate(input);
    return { ...result, operationResults: this.operationResult("contentExternalReferenceUpdate", result.userErrors) };
  }

  @WorkflowStep()
  private stepUpdate(input: ContentExternalReferenceUpdateWorkflowInput) {
    return this.kernel.runScript(ContentExternalReferenceUpdateScript, input.params, this.toScriptContext(input.context));
  }
}

export const entityUpdateWorkflows = [
  StoreConfigurationUpdateWorkflow,
  QuestionSubscriptionUpdateWorkflow,
  ContentRedactWorkflow,
  ContentRevisionRestoreWorkflow,
  ReviewRequestUpdateWorkflow,
  ContentReportUpdateWorkflow,
  ModerationCaseUpdateWorkflow,
  ContentExternalReferenceUpdateWorkflow,
];
