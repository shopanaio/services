import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  InjectBroker,
  Policy,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import type { RunScriptContext } from "../kernel/types.js";
import type { SearchSettingsValueInput } from "../repositories/search/searchRepositoryTypes.js";
import { SearchSettingsUpdateScript } from "../scripts/search/index.js";
import { validateAndNormalizeSearchSettings } from "../scripts/search/SearchSettingsScripts.js";
import { searchConfigurationUserErrors } from "../scripts/search/scriptError.js";
import { searchSettingsCacheKey } from "../search/configuration/cacheKeys.js";
import type {
  SearchSettingsUpdateWorkflowInput,
  SearchSettingsUpdateWorkflowResult,
  SearchSettingsWorkflowContext,
} from "./dto/SearchSettingsUpdateWorkflowDto.js";

type SettingsInitializeResult =
  { initialized: boolean } | { error: { message: string; field: string[]; code: string } };

type SettingsValidationResult =
  | { values: SearchSettingsValueInput }
  | { errors: ReturnType<typeof searchConfigurationUserErrors> };

@Injectable()
export class SearchSettingsUpdateWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("listing") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Workflow("searchSettingsUpdate")
  @Policy<SearchSettingsUpdateWorkflowInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(input: SearchSettingsUpdateWorkflowInput): Promise<SearchSettingsUpdateWorkflowResult> {
    const validation = await this.stepValidateSettings(input);
    if ("errors" in validation) {
      return {
        settings: null,
        operationResults: [
          {
            type: "settingsUpdate",
            applied: false,
            errors: validation.errors,
          },
        ],
        userErrors: validation.errors,
      };
    }

    const acquired = await this.stepInitializeSettings(input, validation.values);
    if ("error" in acquired) {
      return {
        settings: null,
        operationResults: [],
        userErrors: [acquired.error],
      };
    }

    if (!acquired.initialized) {
      const result = await this.stepUpdateSettings(input);
      if (result.userErrors.length > 0) {
        return {
          settings: null,
          operationResults: [
            {
              type: "settingsUpdate",
              applied: false,
              errors: result.userErrors,
            },
          ],
          userErrors: result.userErrors,
        };
      }
    }

    await this.stepInvalidateSettingsCache(input.context.storeId);
    return {
      settings: {},
      operationResults: [
        {
          type: "settingsUpdate",
          applied: true,
          errors: [],
        },
      ],
      userErrors: [],
    };
  }

  @WorkflowStep()
  private async stepValidateSettings(
    input: SearchSettingsUpdateWorkflowInput,
  ): Promise<SettingsValidationResult> {
    try {
      return { values: validateAndNormalizeSearchSettings(input.settings) };
    } catch (error) {
      return { errors: searchConfigurationUserErrors(error) };
    }
  }

  @WorkflowStep()
  private async stepInitializeSettings(
    input: SearchSettingsUpdateWorkflowInput,
    values: SearchSettingsValueInput,
  ): Promise<SettingsInitializeResult> {
    const result = await this.kernel.repository.searchSettings.initialize({
      storeId: input.context.storeId,
      values,
    });
    if (result.status === "not_found") {
      return {
        error: {
          message: "Search settings are not initialized",
          field: ["settings"],
          code: "SETTINGS_NOT_INITIALIZED",
        },
      };
    }
    return { initialized: result.initialized };
  }

  @WorkflowStep()
  private stepUpdateSettings(input: SearchSettingsUpdateWorkflowInput) {
    return this.kernel.runScript(
      SearchSettingsUpdateScript,
      input.settings,
      toRunScriptContext(input.context),
    );
  }

  @WorkflowStep()
  private async stepInvalidateSettingsCache(storeId: string): Promise<void> {
    await this.kernel.cache.del(searchSettingsCacheKey(storeId));
  }
}

function toRunScriptContext(context: SearchSettingsWorkflowContext): RunScriptContext {
  return {
    storeId: context.storeId,
    organizationId: context.organizationId,
    userId: context.userId,
    locale: context.locale,
    defaultLocale: context.locale,
    requestId: context.requestId,
  };
}
