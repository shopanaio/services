import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('OrderCreate API', () => {
  test('Create', async ({ api }) => {
    await api.session.setupUserAndProject();

    const order = await api.admin.order.create();
    expect(typeof order.id).toBe('string');
  });
});
