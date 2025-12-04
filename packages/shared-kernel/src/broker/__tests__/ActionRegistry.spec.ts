import { jest } from '@jest/globals';
import { ActionRegistry } from '../ActionRegistry';

describe('ActionRegistry', () => {
  it('registers and resolves actions', async () => {
    const registry = new ActionRegistry();
    const handler = jest.fn(async () => 'ok');

    registry.register('payments.test', handler);
    const resolved = registry.resolve('payments.test');

    await expect(resolved(undefined)).resolves.toBe('ok');
    expect(handler).toHaveBeenCalledWith(undefined);
  });

  it('prevents duplicates', () => {
    const registry = new ActionRegistry();
    const handler = jest.fn();

    registry.register('payments.test', handler);
    expect(() => registry.register('payments.test', handler)).toThrow(
      'Action "payments.test" already registered',
    );
  });

  it('deregisters actions', () => {
    const registry = new ActionRegistry();
    const handler = jest.fn();

    registry.register('payments.test', handler);
    registry.deregister('payments.test');

    expect(() => registry.resolve('payments.test')).toThrow('Action "payments.test" not found');
  });

  it('lists registered actions', () => {
    const registry = new ActionRegistry();

    registry.register('payments.a', jest.fn());
    registry.register('inventory.b', jest.fn());

    expect(registry.list().sort()).toEqual(['inventory.b', 'payments.a']);
  });
});
