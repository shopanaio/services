import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Admin API Key Management', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndProject();
  });

  test('should create an API key', async ({ api }) => {
    const keyName = 'Test API Key';
    const apiKey = await api.admin.apiKey.create({ name: keyName });

    expect(apiKey).toBeDefined();
    expect(typeof apiKey).toBe('string');

    const keys = await api.admin.apiKey.findMany();
    const createdKey = keys.find((k) => k.name === keyName);
    expect(createdKey).toBeDefined();
    expect(createdKey?.name).toBe(keyName);
  });

  test('should delete an API key', async ({ api }) => {
    const keyName = 'Key to be deleted';
    await api.admin.apiKey.create({ name: keyName });

    let keys = await api.admin.apiKey.findMany();
    const keyToDelete = keys.find((k) => k.name === keyName);
    expect(keyToDelete).toBeDefined();

    if (keyToDelete) {
      const isDeleted = await api.admin.apiKey.delete(keyToDelete.id);
      expect(isDeleted).toBe(true);

      keys = await api.admin.apiKey.findMany();
      const deletedKey = keys.find((k) => k.id === keyToDelete.id);
      expect(deletedKey).toBeUndefined();
    }
  });

  test('should return a list of API keys', async ({ api }) => {
    await api.admin.apiKey.create({ name: 'Test Key 1' });
    await api.admin.apiKey.create({ name: 'Test Key 2' });

    const keys = await api.admin.apiKey.findMany();
    expect(keys.length).toBeGreaterThanOrEqual(2);
  });
});
