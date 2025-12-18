import { test } from '@fixtures/grpc/api';
import { expect } from '@playwright/test';
import {
  grpcContextSchema,
  grpcProjectSchema,
  grpcUserSchema,
  grpcCustomerSchema,
} from '@schema/grpcSchema';

test.describe('gRPC Apps API - Schema Validation', () => {
  test('should match context schema with tenant', async ({ api, grpc }) => {
    await api.session.setupUserAndProject();

    const context = await grpc.apps.getContext();

    // Validate against Yup schema
    expect(() => grpcContextSchema.validateSync(context)).not.toThrow();
  });

  test('should match context schema with customer', async ({ api, grpc }) => {
    await api.session.setupClientAndCustomer();

    const context = await grpc.apps.getContext();

    // Validate against Yup schema
    expect(() => grpcContextSchema.validateSync(context)).not.toThrow();
  });

  test('should match project schema', async ({ api, grpc }) => {
    await api.session.setupUserAndProject();

    const context = await grpc.apps.getContext();
    const project = context?.project;

    expect(project).toBeDefined();
    expect(() => grpcProjectSchema.validateSync(project)).not.toThrow();
  });

  test('should match user schema', async ({ api, grpc }) => {
    await api.session.setupUserAndProject();

    const context = await grpc.apps.getContext();
    const tenant = context?.tenant;

    expect(tenant).toBeDefined();
    expect(() => grpcUserSchema.validateSync(tenant)).not.toThrow();
  });

  test('should match customer schema', async ({ api, grpc }) => {
    await api.session.setupClientAndCustomer();

    const context = await grpc.apps.getContext();
    const customer = context?.customer;

    expect(customer).toBeDefined();
    expect(() => grpcCustomerSchema.validateSync(customer)).not.toThrow();
  });

  test('locales should have correct structure', async ({ api, grpc }) => {
    await api.session.setupUserAndProject();

    const context = await grpc.apps.getContext();
    const locales = context?.project?.locales || [];

    locales.forEach((locale) => {
      expect(locale.code).toBeTruthy();
      expect(typeof locale.code).toBe('string');
      expect(typeof locale.isActive).toBe('boolean');
    });
  });

  test('currencies should have correct structure', async ({ api, grpc }) => {
    await api.session.setupUserAndProject();

    const context = await grpc.apps.getContext();
    const currencies = context?.project?.currencies || [];

    currencies.forEach((currency) => {
      expect(currency.code).toBeTruthy();
      expect(typeof currency.code).toBe('string');
      expect(typeof currency.isActive).toBe('boolean');
      expect(typeof currency.exchangeRate).toBe('number');
      expect(currency.exchangeRate).toBeGreaterThan(0);
    });
  });

  test('timestamps should be valid ISO strings', async ({ api, grpc }) => {
    await api.session.setupUserAndProject();

    const context = await grpc.apps.getContext();
    const tenant = context?.tenant;

    expect(tenant?.createdAt).toBeTruthy();
    expect(tenant?.updatedAt).toBeTruthy();

    // Should be valid dates
    const createdDate = new Date(tenant?.createdAt || '');
    const updatedDate = new Date(tenant?.updatedAt || '');

    expect(createdDate.toString()).not.toBe('Invalid Date');
    expect(updatedDate.toString()).not.toBe('Invalid Date');
  });
});
