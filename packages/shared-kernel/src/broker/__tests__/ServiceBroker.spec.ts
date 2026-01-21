import { jest } from '@jest/globals';
import { ActionRegistry } from '../ActionRegistry';
import { ServiceBroker } from '../ServiceBroker';
import type { ActionHandler } from '../ActionRegistry';

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

  it('emit() calls events.emit action with auto-injected source', async () => {
    const registry = new ActionRegistry();
    const broker = createBroker({ registry });

    // Register a mock events.emit action
    const mockEmitResult = { workflowId: 'wf-123', eventId: 'evt-456' };
    const mockHandler = jest.fn(async () => mockEmitResult);
    registry.register('events.emit', mockHandler);

    const result = await broker.emit('order.created', {
      payload: { id: '1' },
      context: { tenantId: 'tenant-1' },
      subject: { type: 'order', id: '1' },
      emitKey: 'order:1',
    });

    expect(result).toEqual(mockEmitResult);
    // source is auto-injected from serviceName ('payments')
    expect(mockHandler).toHaveBeenCalledWith({
      eventType: 'order.created',
      source: 'payments',
      payload: { id: '1' },
      context: { tenantId: 'tenant-1' },
      subject: { type: 'order', id: '1' },
      emitKey: 'order:1',
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
