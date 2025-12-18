import { test } from '@fixtures/grpc/api';
import { expect } from '@playwright/test';

test.describe('gRPC Apps API - Authentication', () => {
  test('should require authentication headers', async ({ grpc }) => {
    // No session setup, so no auth headers
    const context = await grpc.apps.getContext();

    // Should return null due to missing authentication
    expect(context).toBeNull();
  });

  test('should authenticate with x-pj-key and bearer token', async ({ api, grpc }) => {
    await api.session.setupUserAndProject();

    // Session has projectSlug (x-pj-key) and accessToken (Bearer)
    const context = await grpc.apps.getContext();

    // Should successfully authenticate
    expect(context).not.toBeNull();
    expect(context?.project).toBeDefined();
    expect(context?.tenant).toBeDefined();
  });

  test('should authenticate with x-api-key for customer scope', async ({ api, grpc }) => {
    await api.session.setupClient();
    await api.session.setupCustomer();

    // Session has apiKey (x-api-key) and customer accessToken
    const context = await grpc.apps.getContext();

    // Should successfully authenticate
    expect(context).not.toBeNull();
    expect(context?.project).toBeDefined();
    expect(context?.customer).toBeDefined();
  });

  test('should work with valid project key', async ({ api, grpc }) => {
    await api.session.setupUserAndProject();

    const projectSlug = api.session.projectSlug;
    expect(projectSlug).toBeTruthy();

    const context = await grpc.apps.getContext();

    // Context should include the correct project
    expect(context?.project?.id).toBeTruthy();
  });

  test('should include tracing headers', async ({ api, grpc }) => {
    await api.session.setupUserAndProject();

    // The grpcClient automatically adds x-trace-id and x-correlation-id
    const context = await grpc.apps.getContext();

    // If server accepts and processes tracing headers, context should be returned
    expect(context).not.toBeNull();
  });

  test('gRPC connection should be properly configured', async ({ grpc }) => {
    const grpcHost = grpc.apps.getGrpcHost();

    // Check that gRPC host is configured
    expect(grpcHost).toBeTruthy();
    expect(grpcHost).toContain(':'); // Should have host:port format

    // Default is localhost:50051
    if (!process.env.PLATFORM_GRPC_HOST) {
      expect(grpcHost).toBe('localhost:50051');
    }
  });
});
