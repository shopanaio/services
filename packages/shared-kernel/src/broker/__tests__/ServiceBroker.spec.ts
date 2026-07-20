import { jest } from '@jest/globals';
import { z } from 'zod';
import { ActionRegistry } from '../ActionRegistry';
import { ServiceBroker } from '../ServiceBroker';
import type { ActionCallContext, ActionHandler } from '../ActionRegistry';
import { BrokerActions } from '../BrokerActions';
import { Action } from '../../decorators/Action';
import { Policy } from '../../decorators/Authorize';
import { ZodSchema } from '../../decorators/ZodSchema';

class SecuredBrokerActions extends BrokerActions {
  readonly authProvider = {
    subject: 'platform-user',
    authorize: jest.fn(async () => true),
  };

  @Action('securedAction')
  @ZodSchema(z.object({ value: z.string() }).strict())
  @Policy<{ value: string }>({
    resource: 'org.stores',
    action: 'read',
    organizationId: '018f8f6d-7980-7000-9000-000000000001',
  })
  async securedAction(
    params: { value: string },
    context: ActionCallContext,
  ): Promise<{ value: string; caller: ActionCallContext['caller'] }> {
    return { value: params.value, caller: context.caller };
  }
}

const createBroker = (options?: { registry?: ActionRegistry }) => {
  const registry = options?.registry ?? new ActionRegistry();
  return new ServiceBroker(registry, { serviceName: 'payments' });
};

describe('ServiceBroker', () => {
  it('qualifies local action names on register', () => {
    const registry = new ActionRegistry();
    const broker = createBroker({ registry });
    const handler: ActionHandler = jest.fn();

    broker.register('getPaymentMethods', handler);

    expect(registry.list()).toEqual(['payments.getPaymentMethods']);
  });

  it('calls handlers via ActionRegistry', async () => {
    const registry = new ActionRegistry();
    const broker = createBroker({ registry });

    broker.register('getPaymentMethods', async (params?: { currency: string }) => {
      return { ok: params?.currency ?? 'n/a' };
    });

    await expect(broker.call('payments.getPaymentMethods', { currency: 'USD' })).resolves.toEqual({
      ok: 'USD',
    });
  });

  it('assigns caller service identity outside the action payload', async () => {
    const registry = new ActionRegistry();
    const broker = createBroker({ registry });
    const handler: ActionHandler = jest.fn(async (_params, context) => context);

    broker.register('inspectCaller', handler);

    await expect(
      broker.call('payments.inspectCaller', {
        caller: { kind: 'event', service: 'forged' },
      }),
    ).resolves.toEqual({
      caller: { kind: 'action', service: 'payments' },
    });
  });

  it('preserves caller context through ZodSchema and Policy decorators', async () => {
    const registry = new ActionRegistry();
    const targetBroker = createBroker({ registry });
    const callerBroker = new ServiceBroker(registry, { serviceName: 'project' });
    const actions = new SecuredBrokerActions(targetBroker);
    actions.onModuleInit();

    await expect(
      callerBroker.call('payments.securedAction', { value: 'ok' }),
    ).resolves.toEqual({
      value: 'ok',
      caller: { kind: 'action', service: 'project' },
    });
  });

  it('uses the immediate service identity for nested broker calls', async () => {
    const registry = new ActionRegistry();
    const projectBroker = new ServiceBroker(registry, { serviceName: 'project' });
    const catalogBroker = new ServiceBroker(registry, { serviceName: 'catalog' });
    const iamBroker = new ServiceBroker(registry, { serviceName: 'iam' });

    iamBroker.register('inspectCaller', async (_params, context) => context);
    catalogBroker.register('authorize', async () =>
      catalogBroker.call('iam.inspectCaller'),
    );

    await expect(projectBroker.call('catalog.authorize')).resolves.toEqual({
      caller: { kind: 'action', service: 'catalog' },
    });
  });

  it('assigns persisted producer identity to event handler calls', async () => {
    const registry = new ActionRegistry();
    const eventsBroker = new ServiceBroker(registry, { serviceName: 'events' });
    const listingBroker = new ServiceBroker(registry, { serviceName: 'listing' });

    listingBroker.register('productCreated', async (_params, context) => context);

    await expect(
      eventsBroker.callEvent('listing.productCreated', {}, 'catalog'),
    ).resolves.toEqual({
      caller: { kind: 'event', service: 'catalog' },
    });
  });

  it('does not let ordinary service brokers forge event caller contexts', async () => {
    const broker = createBroker();

    await expect(
      broker.callEvent('payments.eventHandler', {}, 'catalog'),
    ).rejects.toThrow('Only events service can dispatch event broker calls');
  });

  it('assigns event source from broker identity instead of workflow payload', async () => {
    const registry = new ActionRegistry();
    const workflowRegistry = {
      start: jest.fn(async () => ({
        workflowId: 'workflow-id',
        getResult: async () => ({ eventId: 'event-id' }),
      })),
    };
    const broker = new ServiceBroker(
      registry,
      { serviceName: 'catalog' },
      workflowRegistry as never,
    );

    await broker.runWorkflow(
      'events.emit',
      { eventType: 'productCreated', source: 'forged' },
      { source: 'workflow', workflowId: 'parent', stepId: 'emit' },
    );

    expect(workflowRegistry.start).toHaveBeenCalledWith(
      'events.emit',
      { eventType: 'productCreated', source: 'catalog' },
      expect.any(Object),
      undefined,
    );
  });

  it('throws when call action lacks prefix', async () => {
    const broker = createBroker();

    await expect(broker.call('getPaymentMethods')).rejects.toThrow(
      'Action "getPaymentMethods" must include service prefix',
    );
  });

  it('deregisters actions on shutdown', async () => {
    const registry = new ActionRegistry();
    const broker = createBroker({ registry });

    broker.register('localAction', jest.fn());
    await broker.onModuleDestroy();

    expect(registry.list()).toEqual([]);
  });

  it('exposes action metadata and presence', () => {
    const registry = new ActionRegistry();
    const broker = createBroker({ registry });
    const handler: ActionHandler = jest.fn();

    broker.register('retryableAction', handler, {
      retryPolicy: { maxAttempts: 4, intervalSeconds: 3, backoffRate: 2 },
    });

    expect(broker.hasAction('payments.retryableAction')).toBe(true);
    expect(broker.getActionMetadata('payments.retryableAction')).toEqual({
      retryPolicy: { maxAttempts: 4, intervalSeconds: 3, backoffRate: 2 },
    });
  });

  it('isHealthy returns true', () => {
    const broker = createBroker();
    expect(broker.isHealthy()).toBe(true);
  });

  it('getHealth returns service info', () => {
    const registry = new ActionRegistry();
    const broker = createBroker({ registry });
    broker.register('testAction', jest.fn());

    const health = broker.getHealth();

    expect(health.serviceName).toBe('payments');
    expect(health.registeredActions).toContain('payments.testAction');
    expect(health.inFlight).toBe(0);
  });
});
