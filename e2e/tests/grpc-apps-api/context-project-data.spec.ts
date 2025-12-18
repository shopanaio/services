import { test } from '@fixtures/grpc/api';
import { expect } from '@playwright/test';

test.describe('gRPC Apps API - Project Data', () => {
  test('should return project with correct metadata', async ({ api, grpc }) => {
    await api.session.setupUserAndProject();

    const context = await grpc.apps.getContext();
    const project = context?.project;

    expect(project).toBeDefined();
    expect(project?.id).toBeTruthy();
    expect(project?.name).toBe('Session Store');
    expect(project?.currency).toBe('EUR');
    expect(project?.country).toBe('UA');
    expect(project?.timezone).toBe('Europe/Kiev');
  });

  test('should include valid email and phone for project', async ({ api, grpc }) => {
    await api.session.setupUserAndProject();

    const context = await grpc.apps.getContext();
    const project = context?.project;

    expect(project?.email).toBeTruthy();
    // Email should be in valid format
    expect(project?.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  test('should include default locale in project', async ({ api, grpc }) => {
    await api.session.setupUserAndProject();

    const context = await grpc.apps.getContext();
    const project = context?.project;

    expect(project?.locale).toBeTruthy();
    expect(project?.locale).toBe('en');
  });

  test('should include multiple locales', async ({ api, grpc }) => {
    await api.session.setupUserAndProject();

    const context = await grpc.apps.getContext();
    const locales = context?.project?.locales || [];

    // Should have at least 2 locales (EN and RU as configured in setupProject)
    expect(locales.length).toBeGreaterThanOrEqual(2);

    // Check EN locale
    const enLocale = locales.find((l) => l.code === 'en');
    expect(enLocale).toBeDefined();
    expect(enLocale?.code).toBe('en');
    expect(typeof enLocale?.isActive).toBe('boolean');

    // Check RU locale
    const ruLocale = locales.find((l) => l.code === 'ru');
    expect(ruLocale).toBeDefined();
    expect(ruLocale?.code).toBe('ru');
    expect(typeof ruLocale?.isActive).toBe('boolean');
  });

  test('should include base currency with correct exchange rate', async ({ api, grpc }) => {
    await api.session.setupUserAndProject();

    const context = await grpc.apps.getContext();
    const currencies = context?.project?.currencies || [];

    expect(currencies.length).toBeGreaterThan(0);

    // Find EUR currency (base currency)
    const eurCurrency = currencies.find((c) => c.code === 'EUR');
    expect(eurCurrency).toBeDefined();
    expect(eurCurrency?.exchangeRate).toBe(1);
    expect(eurCurrency?.isActive).toBe(true);
  });

  test('should have consistent project data across multiple calls', async ({ api, grpc }) => {
    await api.session.setupUserAndProject();

    // First call
    const context1 = await grpc.apps.getContext();
    const project1 = context1?.project;

    // Second call
    const context2 = await grpc.apps.getContext();
    const project2 = context2?.project;

    // Projects should be identical
    expect(project1?.id).toBe(project2?.id);
    expect(project1?.name).toBe(project2?.name);
    expect(project1?.currency).toBe(project2?.currency);
    expect(project1?.locale).toBe(project2?.locale);
    expect(project1?.timezone).toBe(project2?.timezone);
  });
});
