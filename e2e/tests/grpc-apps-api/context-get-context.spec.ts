import { test } from '@fixtures/grpc/api';
import { expect } from '@playwright/test';

test.describe('gRPC Apps API - GetContext', () => {
  test('should fetch context with valid tenant credentials', async ({ api, grpc }) => {
    // Setup user and project
    await api.session.setupUserAndProject();

    // Fetch context via gRPC
    const context = await grpc.apps.getContext();

    // Assert context is returned
    expect(context).not.toBeNull();
    await grpc.apps.assertContext(context);

    // Assert project data
    expect(context?.project).toBeDefined();
    if (context?.project) {
      await grpc.apps.assertProject(context.project);
      expect(context.project.name).toBe('Session Store');
    }

    // Assert tenant data
    expect(context?.tenant).toBeDefined();
    if (context?.tenant) {
      await grpc.apps.assertUser(context.tenant);
      expect(context.tenant.email).toBe(api.session.tenant.data.email);
    }

    // Customer should be null for tenant scope
    expect(context?.customer).toBeNull();
  });

  test('should fetch context with valid customer credentials', async ({ api, grpc }) => {
    // Setup client with API key and customer
    await api.session.setupClientAndCustomer();

    // Fetch context via gRPC
    const context = await grpc.apps.getContext();

    // Assert context is returned
    expect(context).not.toBeNull();
    await grpc.apps.assertContext(context);

    // Assert project data
    expect(context?.project).toBeDefined();
    if (context?.project) {
      await grpc.apps.assertProject(context.project);
    }

    // Assert customer data
    expect(context?.customer).toBeDefined();
    if (context?.customer) {
      await grpc.apps.assertCustomer(context.customer);
      expect(context.customer.email).toBe(api.session.customer.data.email);
    }

    // Tenant should be null for customer scope
    expect(context?.tenant).toBeNull();
  });

  test('should return UNAUTHENTICATED error with invalid credentials', async ({ grpc }) => {
    // Try to fetch context without setting up session (no valid credentials)
    const context = await grpc.apps.getContext();

    // Should return null due to UNAUTHENTICATED error
    expect(context).toBeNull();
  });

  test('should include all project locales', async ({ api, grpc }) => {
    await api.session.setupUserAndProject();

    const context = await grpc.apps.getContext();

    expect(context?.project?.locales).toBeDefined();
    expect(context?.project?.locales.length).toBeGreaterThan(0);

    // Check that default locale is present
    const locales = context?.project?.locales || [];
    const enLocale = locales.find((l) => l.code === 'en');
    expect(enLocale).toBeDefined();
    expect(enLocale?.isActive).toBe(true);
  });

  test('should include all project currencies', async ({ api, grpc }) => {
    await api.session.setupUserAndProject();

    const context = await grpc.apps.getContext();

    expect(context?.project?.currencies).toBeDefined();
    expect(context?.project?.currencies.length).toBeGreaterThan(0);

    // Check that default currency is present
    const currencies = context?.project?.currencies || [];
    const eurCurrency = currencies.find((c) => c.code === 'EUR');
    expect(eurCurrency).toBeDefined();
    expect(eurCurrency?.isActive).toBe(true);
    expect(eurCurrency?.exchangeRate).toBeGreaterThan(0);
  });

  test('should include stock statuses', async ({ api, grpc }) => {
    await api.session.setupUserAndProject();

    const context = await grpc.apps.getContext();

    expect(context?.project?.stockStatuses).toBeDefined();
    expect(Array.isArray(context?.project?.stockStatuses)).toBe(true);
  });

  test('should return valid timestamps for tenant', async ({ api, grpc }) => {
    await api.session.setupUserAndProject();

    const context = await grpc.apps.getContext();

    console.log('Tenant timestamps:', {
      createdAt: context?.tenant?.createdAt,
      updatedAt: context?.tenant?.updatedAt,
      tenant: context?.tenant,
    });

    expect(context?.tenant?.createdAt).toBeDefined();
    expect(context?.tenant?.updatedAt).toBeDefined();

    // Check timestamps are valid ISO strings
    const createdAt = new Date(context?.tenant?.createdAt || '');
    const updatedAt = new Date(context?.tenant?.updatedAt || '');

    expect(createdAt.getTime()).toBeGreaterThan(0);
    expect(updatedAt.getTime()).toBeGreaterThan(0);
    expect(updatedAt.getTime()).toBeGreaterThanOrEqual(createdAt.getTime());
  });

  test('should return valid timestamps for customer', async ({ api, grpc }) => {
    await api.session.setupClientAndCustomer();

    const context = await grpc.apps.getContext();

    expect(context?.customer?.createdAt).toBeDefined();
    expect(context?.customer?.updatedAt).toBeDefined();

    // Check timestamps are valid ISO strings
    const createdAt = new Date(context?.customer?.createdAt || '');
    const updatedAt = new Date(context?.customer?.updatedAt || '');

    expect(createdAt.getTime()).toBeGreaterThan(0);
    expect(updatedAt.getTime()).toBeGreaterThan(0);
    expect(updatedAt.getTime()).toBeGreaterThanOrEqual(createdAt.getTime());
  });
});
