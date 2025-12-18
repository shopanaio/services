import { test as base } from '@fixtures/api/api';
import { GrpcApps } from './GrpcApps';

/**
 * Extended API fixtures with gRPC support
 */
export interface GrpcApiFixtures {
  grpc: {
    apps: GrpcApps;
  };
}

/**
 * Extend base test with gRPC fixtures
 */
export const test = base.extend<GrpcApiFixtures>({
  grpc: async ({ api }, use) => {
    const grpc = {
      apps: new GrpcApps(api.session),
    };

    await use(grpc);
  },
});
