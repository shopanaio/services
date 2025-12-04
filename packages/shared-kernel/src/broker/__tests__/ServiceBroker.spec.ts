import { jest } from '@jest/globals';
import { ActionRegistry } from '../ActionRegistry';
import { ServiceBroker } from '../ServiceBroker';
import type { ActionHandler } from '../ActionRegistry';

const createBroker = (options?: { registry?: ActionRegistry }) => {
  const registry = options?.registry ?? new ActionRegistry();
  return new ServiceBroker(registry, null, { serviceName: 'payments' });
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

  it('publishes events when RabbitMQ is available', async () => {
    const broker = createBroker();
    const amqp = {
      publish: jest.fn(async () => {}),
      connected: true,
    };

    Reflect.set(broker, 'amqp', amqp);

    await broker.emit('order.created', { id: '1' });
    await broker.broadcast('cache.invalidate');

    expect(amqp.publish).toHaveBeenNthCalledWith(
      1,
      'shopana.events',
      'order.created',
      { id: '1' },
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-source-service': 'payments' }),
      }),
    );

    expect(amqp.publish).toHaveBeenNthCalledWith(
      2,
      'shopana.broadcast',
      'cache.invalidate',
      {},
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-source-service': 'payments' }),
      }),
    );
  });
});
