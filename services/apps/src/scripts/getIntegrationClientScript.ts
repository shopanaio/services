import type {
  TransactionScript,
  KernelServices,
  ScriptContext,
  HttpClient,
} from '@src/kernel/types';

// Parameters for getting integration HTTP client
export interface GetIntegrationClientParams {
  readonly domain: string;
  readonly projectId: string;
  readonly aggregateId: string | null | undefined;
  readonly apiKey: string; // Simplified - no correlation object
}

// Execution result
export interface GetIntegrationClientResult {
  client: HttpClient | null;
  warnings?: Array<{ code: string; message: string }>;
}

/**
 * Transaction Script: Getting HTTP client for integration
 * Simplified without correlation dependencies
 */
export const getIntegrationClientScript: TransactionScript<
  GetIntegrationClientParams,
  GetIntegrationClientResult
> = async (params, services, scriptContext) => {
  console.log("\n\n\ngetIntegrationClientScript");
  const { domain, projectId, aggregateId, apiKey } = params;
  const { slotsRepository, logger } = services;

  try {
    // 1. Input data validation
    if (!domain || !projectId) {
      return {
        client: null,
        warnings: [{ code: 'VALIDATION_ERROR', message: 'Domain and projectId are required' }]
      };
    }

    if (!aggregateId) {
      // aggregate_id is required for this domain
      return { client: null };
    }

    // 2. Search for assigned slot for aggregate
    const result = await slotsRepository.findResolvedSlotForAggregate(
      domain,
      projectId,
      'checkout', // default aggregate type
      aggregateId
    );

    if (!result) {
      // Slot not found for this aggregate
      logger.debug({
        domain,
        projectId,
        aggregateId
      }, 'No slot assignment found for aggregate');

      return { client: null };
    }

    const { slot } = result;

    // 3. Extract baseUrl from slot data
    const baseUrl = (slot.data as any)?.baseUrl;
    if (!baseUrl || typeof baseUrl !== 'string') {
      logger.warn({ slotId: slot.id }, 'Slot missing baseUrl configuration');
      return { client: null };
    }

    // 4. Creating HTTP client with minimal headers
    const httpClient: HttpClient = {
      baseUrl: baseUrl.replace(/\/+$/, ''), // remove trailing slash
      provider: slot.provider,

      fetch: async (path: string, init = {}) => {
        // Simplified headers - only essential ones
        const headers = {
          'x-api-key': apiKey,
          'x-project-id': projectId,
          'content-type': 'application/json',
          ...init.headers // user headers take priority
        };

        // Build full URL
        const fullUrl = `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;

        // Execute request
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return await (globalThis as any).fetch(fullUrl, {
          ...init,
          headers
        });
      }
    };

    // 5. Successful client creation logging
    logger.info({
      domain,
      provider: slot.provider,
      baseUrl,
      projectId,
      aggregateId,
      requestId: scriptContext.requestId
    }, 'Integration client created');

    return { client: httpClient };

  } catch (error) {
    console.log("\n\nerror", error);
    logger.error({
      domain,
      projectId,
      aggregateId,
      error
    }, 'Failed to create integration client');

    return {
      client: null,
      warnings: [{
        code: 'INTERNAL_ERROR',
        message: 'Failed to create integration client'
      }]
    };
  }
};
