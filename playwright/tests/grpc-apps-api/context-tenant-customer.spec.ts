import { test } from '@fixtures/grpc/api';
import { expect } from '@playwright/test';

test.describe('gRPC Apps API - Tenant vs Customer Context', () => {
  test('tenant scope should return tenant but not customer', async ({ api, grpc }) => {
    await api.session.setupUserAndProject();

    // Make sure we're in tenant scope
    api.session.setTenantScope();

    const context = await grpc.apps.getContext();

    // Tenant should be present
    expect(context?.tenant).toBeDefined();
    expect(context?.tenant?.id).toBeTruthy();
    expect(context?.tenant?.email).toBe(api.session.tenant.data.email);

    // Customer should be null in tenant scope
    expect(context?.customer).toBeNull();
  });

  test('customer scope should return customer but not tenant', async ({ api, grpc }) => {
    await api.session.setupClientAndCustomer();

    // Customer scope is set by setupApiKey()
    const context = await grpc.apps.getContext();

    // Customer should be present
    expect(context?.customer).toBeDefined();
    expect(context?.customer?.id).toBeTruthy();
    expect(context?.customer?.email).toBe(api.session.customer.data.email);

    // Tenant should be null in customer scope
    expect(context?.tenant).toBeNull();
  });

  test('tenant should have tenantId field', async ({ api, grpc }) => {
    await api.session.setupUserAndProject();

    const context = await grpc.apps.getContext();
    const tenant = context?.tenant;

    expect(tenant?.id).toBeTruthy();
  });

  test('tenant should have verification flags', async ({ api, grpc }) => {
    await api.session.setupUserAndProject();

    const context = await grpc.apps.getContext();
    const tenant = context?.tenant;

    expect(typeof tenant?.isReady).toBe('boolean');
    expect(typeof tenant?.isVerified).toBe('boolean');
  });

  test('customer should have verification and blocked flags', async ({ api, grpc }) => {
    await api.session.setupClientAndCustomer();

    const context = await grpc.apps.getContext();
    const customer = context?.customer;

    expect(typeof customer?.isVerified).toBe('boolean');
    expect(typeof customer?.isBlocked).toBe('boolean');
    expect(customer?.isBlocked).toBe(false); // New customer should not be blocked
  });

  test('tenant should have language and timezone', async ({ api, grpc }) => {
    await api.session.setupUserAndProject();

    const context = await grpc.apps.getContext();
    const tenant = context?.tenant;

    expect(tenant?.language).toBeTruthy();
    expect(tenant?.timezone).toBeTruthy();
    expect(tenant?.language).toBe('en');
    expect(tenant?.timezone).toBe('Europe/Kiev');
  });

  test('customer phone should be optional', async ({ api, grpc }) => {
    await api.session.setupClientAndCustomer();

    const context = await grpc.apps.getContext();
    const customer = context?.customer;

    // Phone is optional field
    if (customer?.phone) {
      expect(typeof customer.phone).toBe('string');
    }
  });

  test('tenant phoneNumber should be optional', async ({ api, grpc }) => {
    await api.session.setupUserAndProject();

    const context = await grpc.apps.getContext();
    const tenant = context?.tenant;

    // Phone number is optional
    if (tenant?.phoneNumber) {
      expect(typeof tenant.phoneNumber).toBe('string');
    }
  });
});
