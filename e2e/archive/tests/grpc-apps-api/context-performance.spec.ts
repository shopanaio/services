import { test } from '@fixtures/grpc/api';
import { expect } from '@playwright/test';

test.describe('gRPC Apps API - Performance', () => {
  test('should respond quickly to GetContext requests', async ({ api, grpc }) => {
    await api.session.setupUserAndProject();

    const startTime = Date.now();
    const context = await grpc.apps.getContext();
    const endTime = Date.now();

    const duration = endTime - startTime;

    expect(context).not.toBeNull();
    // gRPC should be fast - under 500ms for local connection
    expect(duration).toBeLessThan(500);
  });

  test('should handle multiple concurrent requests', async ({ api, grpc }) => {
    await api.session.setupUserAndProject();

    // Make 5 concurrent requests
    const promises = Array(5)
      .fill(null)
      .map(() => grpc.apps.getContext());

    const results = await Promise.all(promises);

    // All requests should succeed
    results.forEach((context) => {
      expect(context).not.toBeNull();
      expect(context?.project).toBeDefined();
    });

    // All should return the same project
    const projectIds = results.map((r) => r?.project?.id);
    expect(new Set(projectIds).size).toBe(1);
  });

  test('should handle sequential requests efficiently', async ({ api, grpc }) => {
    await api.session.setupUserAndProject();

    const startTime = Date.now();

    // Make 10 sequential requests
    for (let i = 0; i < 10; i++) {
      const context = await grpc.apps.getContext();
      expect(context).not.toBeNull();
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // 10 requests should complete in reasonable time
    expect(totalDuration).toBeLessThan(3000); // 3 seconds for 10 requests
  });

  test('should return consistent data across rapid requests', async ({ api, grpc }) => {
    await api.session.setupUserAndProject();

    // Make 3 rapid requests
    const context1 = await grpc.apps.getContext();
    const context2 = await grpc.apps.getContext();
    const context3 = await grpc.apps.getContext();

    // All should return same data
    expect(context1?.project?.id).toBe(context2?.project?.id);
    expect(context2?.project?.id).toBe(context3?.project?.id);
    expect(context1?.tenant?.id).toBe(context2?.tenant?.id);
    expect(context2?.tenant?.id).toBe(context3?.tenant?.id);
  });
});
