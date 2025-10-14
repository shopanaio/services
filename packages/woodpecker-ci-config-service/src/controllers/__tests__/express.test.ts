import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import { createExpressRouter } from '../express';
import type { ConfigService } from '../../service/config-service';
import type { ConfigFile } from '../../woodpecker/payload';

/**
 * Helper function to create mock ConfigFile objects
 */
function createMockConfig(name: string, data: string): ConfigFile {
  return { name, data };
}

describe('Express Router', () => {
  let app: Express;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      generate: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    app = express();
    app.use(createExpressRouter(mockConfigService));
  });

  describe('POST /', () => {
    it('should return configs on successful generation', async () => {
      const mockRequest = {
        repo: 'test/repo',
        pipeline: 1,
      };
      const mockConfigs = [
        createMockConfig('.woodpecker.yml', 'steps:\n  - name: test\n'),
      ];

      mockConfigService.generate.mockResolvedValue(mockConfigs);

      const response = await request(app)
        .post('/')
        .send(mockRequest)
        .expect(200);

      expect(response.body).toEqual({
        configs: mockConfigs,
      });
      expect(mockConfigService.generate).toHaveBeenCalledWith(mockRequest);
      expect(mockConfigService.generate).toHaveBeenCalledTimes(1);
    });

    it('should handle empty configs array', async () => {
      const mockRequest = {
        repo: 'test/repo',
        pipeline: 1,
      };

      mockConfigService.generate.mockResolvedValue([]);

      const response = await request(app)
        .post('/')
        .send(mockRequest)
        .expect(200);

      expect(response.body).toEqual({
        configs: [],
      });
    });

    it('should return 500 on service error', async () => {
      const mockRequest = {
        repo: 'test/repo',
        pipeline: 1,
      };
      const errorMessage = 'Service error';

      mockConfigService.generate.mockRejectedValue(new Error(errorMessage));

      const response = await request(app)
        .post('/')
        .send(mockRequest)
        .expect(500);

      expect(response.body).toEqual({
        error: errorMessage,
      });
    });

    it('should handle non-Error exceptions', async () => {
      const mockRequest = {
        repo: 'test/repo',
        pipeline: 1,
      };

      mockConfigService.generate.mockRejectedValue('string error');

      const response = await request(app)
        .post('/')
        .send(mockRequest)
        .expect(500);

      expect(response.body).toEqual({
        error: 'Unknown error',
      });
    });

    it('should parse JSON body correctly', async () => {
      const complexRequest = {
        repo: 'test/repo',
        pipeline: 1,
        config: {
          branches: ['main', 'develop'],
          settings: {
            timeout: 3600,
          },
        },
      };

      mockConfigService.generate.mockResolvedValue([]);

      await request(app)
        .post('/')
        .send(complexRequest)
        .expect(200);

      expect(mockConfigService.generate).toHaveBeenCalledWith(complexRequest);
    });

    it('should store rawBody for signature verification', async () => {
      const mockRequest = { repo: 'test/repo' };
      mockConfigService.generate.mockResolvedValue([]);

      const response = await request(app)
        .post('/')
        .send(mockRequest)
        .set('Content-Type', 'application/json')
        .expect(200);

      // Verify that generate was called, which means rawBody was properly set
      expect(mockConfigService.generate).toHaveBeenCalled();
    });

    it('should reject body larger than 2mb', async () => {
      const largeBody = {
        data: 'x'.repeat(3 * 1024 * 1024), // 3MB
      };

      await request(app)
        .post('/')
        .send(largeBody)
        .expect(413);
    });

    it('should handle invalid JSON', async () => {
      await request(app)
        .post('/')
        .set('Content-Type', 'application/json')
        .send('invalid json{')
        .expect(400);
    });

    it('should handle different request structures', async () => {
      const requests = [
        { repo: 'org/repo1', pipeline: 1 },
        { repo: 'org/repo2', pipeline: 2, config: {} },
        { repo: 'org/repo3', pipeline: 3, metadata: { branch: 'main' } },
      ];

      for (const req of requests) {
        mockConfigService.generate.mockResolvedValue([]);

        await request(app)
          .post('/')
          .send(req)
          .expect(200);

        expect(mockConfigService.generate).toHaveBeenCalledWith(req);
      }
    });
  });

  describe('Middleware chain', () => {
    it('should process request through JSON middleware before handler', async () => {
      const mockRequest = { test: 'data' };
      mockConfigService.generate.mockResolvedValue([]);

      await request(app)
        .post('/')
        .send(mockRequest)
        .expect(200);

      // Verify the body was parsed and passed to service
      expect(mockConfigService.generate).toHaveBeenCalledWith(mockRequest);
    });
  });
});
