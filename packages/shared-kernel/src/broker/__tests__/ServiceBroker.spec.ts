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
  ): Promise<{ value: string; callerService: string }> {
    return { value: params.value, callerService: context.callerService };
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
      broker.call('payments.inspectCaller', { callerService: 'forged' }),
    ).resolves.toEqual({ callerService: 'payments' });
  });

  it('preserves caller context through ZodSchema and Policy decorators', async () => {
    const registry = new ActionRegistry();
    const targetBroker = createBroker({ registry });
    const callerBroker = new ServiceBroker(registry, { serviceName: 'project' });
    const actions = new SecuredBrokerActions(targetBroker);
    actions.onModuleInit();

    await expect(
      callerBroker.call('payments.securedAction', { value: 'ok' }),
    ).resolves.toEqual({ value: 'ok', callerService: 'project' });
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
