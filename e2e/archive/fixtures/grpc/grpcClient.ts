import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { GqlRequestSession } from '@fixtures/api/gqlRequest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Base gRPC client for testing Platform gRPC services
 */
export class BaseGrpcClient {
  protected client: any;
  protected grpcHost: string;

  constructor(
    protected session: GqlRequestSession,
    serviceName: string = 'ContextService',
  ) {
    this.grpcHost = process.env.PLATFORM_GRPC_HOST || 'localhost:50051';
    this.client = this.createClient(serviceName);
  }

  /**
   * Load proto definitions and create client
   */
  private createClient(serviceName: string): any {
    const PROTO_PATH = join(__dirname, '../../../packages/platform-proto/proto/context.proto');

    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: false,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
      includeDirs: [join(__dirname, '../../../packages/platform-proto/proto')],
    });

    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
    const appsV1 = (protoDescriptor as any).apps.v1;

    if (!appsV1[serviceName]) {
      throw new Error(`Service ${serviceName} not found in proto definitions`);
    }

    return new appsV1[serviceName](this.grpcHost, grpc.credentials.createInsecure());
  }

  /**
   * Create gRPC metadata from session
   */
  protected createMetadata(): grpc.Metadata {
    const metadata = new grpc.Metadata();
    const { projectSlug, apiKey, accessToken, scope } = this.session;

    // Add authentication headers
    if (scope === 'customer' && apiKey) {
      metadata.add('x-api-key', apiKey);
    } else if (scope === 'tenant' && projectSlug) {
      metadata.add('x-pj-key', projectSlug);
    }

    if (accessToken) {
      metadata.add('authorization', `Bearer ${accessToken}`);
    }

    // Add tracing headers
    metadata.add('x-trace-id', `test-${Date.now()}`);
    metadata.add('x-correlation-id', `test-correlation-${Date.now()}`);

    return metadata;
  }

  /**
   * Make a unary gRPC call
   */
  protected async call<TRequest, TResponse>(
    method: string,
    request: TRequest,
  ): Promise<{ response: TResponse; error: grpc.ServiceError | null }> {
    return new Promise((resolve) => {
      const metadata = this.createMetadata();

      this.client[method](request, metadata, (error: grpc.ServiceError | null, response: TResponse) => {
        resolve({ response, error });
      });
    });
  }

  /**
   * Helper to handle errors
   */
  protected handleError(error: grpc.ServiceError | null): void {
    if (error) {
      throw new Error(`gRPC Error [${error.code}]: ${error.details}`);
    }
  }
}
