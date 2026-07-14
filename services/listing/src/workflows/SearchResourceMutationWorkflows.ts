import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  InjectBroker,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import type { RunScriptContext } from "../kernel/types.js";
import {
  SearchProductBoostCreateScript,
  SearchProductBoostDeleteScript,
  SearchProductBoostUpdateScript,
  SearchSynonymGroupCreateScript,
  SearchSynonymGroupDeleteScript,
  SearchSynonymGroupUpdateScript,
} from "../scripts/search/index.js";
import type {
  SearchProductBoostCreateWorkflowInput,
  SearchProductBoostDeleteWorkflowInput,
  SearchProductBoostMutationWorkflowResult,
  SearchProductBoostUpdateWorkflowInput,
  SearchSynonymGroupCreateWorkflowInput,
  SearchSynonymGroupDeleteWorkflowInput,
  SearchSynonymGroupMutationWorkflowResult,
  SearchSynonymGroupUpdateWorkflowInput,
} from "./dto/SearchResourceMutationWorkflowDto.js";
import type { SearchSettingsWorkflowContext } from "./dto/SearchSettingsUpdateWorkflowDto.js";

abstract class SearchResourceMutationWorkflow extends BrokerWorkflows {
  protected get kernel(): Kernel {
    return Kernel.getInstance();
  }

  protected async invalidateCaches(keys: readonly string[] | undefined): Promise<void> {
    await Promise.allSettled(
      [...new Set(keys ?? [])].map((key) => this.kernel.cache.del(key)),
    );
  }
}

@Injectable()
export class SearchSynonymGroupCreateWorkflow
  extends SearchResourceMutationWorkflow {
  constructor(@InjectBroker("listing") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("searchSynonymGroupCreate")
  async run(
    input: SearchSynonymGroupCreateWorkflowInput,
  ): Promise<SearchSynonymGroupMutationWorkflowResult> {
    const result = await this.stepCreate(input);
    await this.stepInvalidateCaches(result.cacheKeys);
    return { synonymGroup: result.synonymGroup, userErrors: result.userErrors };
  }

  @WorkflowStep()
  private stepCreate(input: SearchSynonymGroupCreateWorkflowInput) {
    return this.kernel.runScript(
      SearchSynonymGroupCreateScript,
      input.params,
      toRunScriptContext(input.context),
    );
  }

  @WorkflowStep()
  private stepInvalidateCaches(keys: readonly string[] | undefined): Promise<void> {
    return this.invalidateCaches(keys);
  }
}

@Injectable()
export class SearchSynonymGroupUpdateWorkflow
  extends SearchResourceMutationWorkflow {
  constructor(@InjectBroker("listing") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("searchSynonymGroupUpdate")
  async run(
    input: SearchSynonymGroupUpdateWorkflowInput,
  ): Promise<SearchSynonymGroupMutationWorkflowResult> {
    const result = await this.stepUpdate(input);
    await this.stepInvalidateCaches(result.cacheKeys);
    return { synonymGroup: result.synonymGroup, userErrors: result.userErrors };
  }

  @WorkflowStep()
  private stepUpdate(input: SearchSynonymGroupUpdateWorkflowInput) {
    return this.kernel.runScript(
      SearchSynonymGroupUpdateScript,
      input.params,
      toRunScriptContext(input.context),
    );
  }

  @WorkflowStep()
  private stepInvalidateCaches(keys: readonly string[] | undefined): Promise<void> {
    return this.invalidateCaches(keys);
  }
}

@Injectable()
export class SearchProductBoostCreateWorkflow
  extends SearchResourceMutationWorkflow {
  constructor(@InjectBroker("listing") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("searchProductBoostCreate")
  async run(
    input: SearchProductBoostCreateWorkflowInput,
  ): Promise<SearchProductBoostMutationWorkflowResult> {
    const result = await this.stepCreate(input);
    await this.stepInvalidateCaches(result.cacheKeys);
    return { productBoost: result.productBoost, userErrors: result.userErrors };
  }

  @WorkflowStep()
  private stepCreate(input: SearchProductBoostCreateWorkflowInput) {
    return this.kernel.runScript(
      SearchProductBoostCreateScript,
      input.params,
      toRunScriptContext(input.context),
    );
  }

  @WorkflowStep()
  private stepInvalidateCaches(keys: readonly string[] | undefined): Promise<void> {
    return this.invalidateCaches(keys);
  }
}

@Injectable()
export class SearchProductBoostUpdateWorkflow
  extends SearchResourceMutationWorkflow {
  constructor(@InjectBroker("listing") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("searchProductBoostUpdate")
  async run(
    input: SearchProductBoostUpdateWorkflowInput,
  ): Promise<SearchProductBoostMutationWorkflowResult> {
    const result = await this.stepUpdate(input);
    await this.stepInvalidateCaches(result.cacheKeys);
    return { productBoost: result.productBoost, userErrors: result.userErrors };
  }

  @WorkflowStep()
  private stepUpdate(input: SearchProductBoostUpdateWorkflowInput) {
    return this.kernel.runScript(
      SearchProductBoostUpdateScript,
      input.params,
      toRunScriptContext(input.context),
    );
  }

  @WorkflowStep()
  private stepInvalidateCaches(keys: readonly string[] | undefined): Promise<void> {
    return this.invalidateCaches(keys);
  }
}

@Injectable()
export class SearchSynonymGroupDeleteWorkflow
  extends SearchResourceMutationWorkflow {
  constructor(@InjectBroker("listing") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("searchSynonymGroupDelete")
  async run(
    input: SearchSynonymGroupDeleteWorkflowInput,
  ): Promise<SearchSynonymGroupMutationWorkflowResult> {
    const result = await this.stepDelete(input);
    await this.stepInvalidateCaches(result.cacheKeys);
    return { synonymGroup: result.synonymGroup, userErrors: result.userErrors };
  }

  @WorkflowStep()
  private stepDelete(input: SearchSynonymGroupDeleteWorkflowInput) {
    return this.kernel.runScript(
      SearchSynonymGroupDeleteScript,
      input.params,
      toRunScriptContext(input.context),
    );
  }

  @WorkflowStep()
  private stepInvalidateCaches(keys: readonly string[] | undefined): Promise<void> {
    return this.invalidateCaches(keys);
  }
}

@Injectable()
export class SearchProductBoostDeleteWorkflow
  extends SearchResourceMutationWorkflow {
  constructor(@InjectBroker("listing") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("searchProductBoostDelete")
  async run(
    input: SearchProductBoostDeleteWorkflowInput,
  ): Promise<SearchProductBoostMutationWorkflowResult> {
    const result = await this.stepDelete(input);
    await this.stepInvalidateCaches(result.cacheKeys);
    return { productBoost: result.productBoost, userErrors: result.userErrors };
  }

  @WorkflowStep()
  private stepDelete(input: SearchProductBoostDeleteWorkflowInput) {
    return this.kernel.runScript(
      SearchProductBoostDeleteScript,
      input.params,
      toRunScriptContext(input.context),
    );
  }

  @WorkflowStep()
  private stepInvalidateCaches(keys: readonly string[] | undefined): Promise<void> {
    return this.invalidateCaches(keys);
  }
}

function toRunScriptContext(
  context: SearchSettingsWorkflowContext,
): RunScriptContext {
  return {
    storeId: context.storeId,
    organizationId: context.organizationId,
    userId: context.userId,
    locale: context.locale,
    defaultLocale: context.locale,
    requestId: context.requestId,
  };
}
