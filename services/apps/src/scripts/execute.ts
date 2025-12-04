import { Domain } from '@shopana/plugin-sdk';
import type { TransactionScript, BaseKernelServices } from '@shopana/shared-kernel';
import type { SlotsRepository } from '../infrastructure/repositories/slotsRepository';
import type { AppsPluginManager } from '../infrastructure/plugins/pluginManager';

export interface ExecuteParams {
  domain: Domain;
  operation: string;
  provider?: string;
  params?: Record<string, unknown>;
}

export interface ExecuteResult {
  data: unknown[];
  warnings: Array<{ code: string; message: string; details?: unknown }>;
}

export interface AppsKernelServices extends BaseKernelServices {
  slotsRepository: SlotsRepository;
  pluginManager: AppsPluginManager;
}

export const execute: TransactionScript<ExecuteParams, ExecuteResult, AppsKernelServices> = async (
  params,
  services,
) => {
  const { domain, operation, provider, params: opParams = {} } = params;
  const projectId = opParams.projectId as string | undefined;

  if (!projectId) {
    throw new Error('projectId is required in params');
  }

  const { slotsRepository, pluginManager } = services;
  const slots = await slotsRepository.findAllSlots(projectId, domain);
  const targetSlots = provider
    ? slots.filter((s: any) => s.provider === provider)
    : slots;

  const warnings: ExecuteResult['warnings'] = [];

  // Target a single provider if specified
  if (provider) {
    const s = targetSlots[0];
    if (!s) {
      throw new Error(`Provider ${provider} not installed for domain ${domain}`);
    }
    const data = await pluginManager.executeOnProvider({
      domain,
      operationId: operation,
      pluginCode: s.provider,
      rawConfig: (s.config?.data ?? {}) as any,
      projectId,
      input: opParams,
    });
    return { data, warnings };
  }

  // Execute on all providers for the domain
  const exec = await pluginManager.executeOnAll({
    domain,
    operationId: operation,
    slots: targetSlots.map((s: any) => ({
      provider: s.provider,
      data: s.config?.data ?? {},
    })) as any,
    projectId,
    input: opParams,
  });

  warnings.push(
    ...exec.warnings.map((w: any) => ({
      code: 'PROVIDER_ERROR',
      message: w.message,
      details: { provider: w.provider, error: w.error },
    })),
  );

  const data = ([] as any[]).concat(...exec.results);
  return { data, warnings };
};
