import { describe, it, expect } from '@jest/globals';
import { verifyHttpMessageSignature, verifyHmacSignature } from '../signature';
import crypto from 'crypto';
import * as ed25519 from '@noble/ed25519';
import type { Request } from 'express';

describe('signature verification', () => {
  describe('verifyHttpMessageSignature', () => {
    it('should return false when signature header is missing', async () => {
      const mockReq = {
        headers: {},
        method: 'POST',
        url: '/config',
      } as Partial<Request> as Request;

      const result = await verifyHttpMessageSignature(mockReq, 'pubkey');
      expect(result).toBe(false);
    });

    it('should return false when signature-input header is missing', async () => {
      const mockReq = {
        headers: {
          signature: 'woodpecker-ci-extensions=:abc123:',
        },
        method: 'POST',
        url: '/config',
      } as Partial<Request> as Request;

      const result = await verifyHttpMessageSignature(mockReq, 'pubkey');
      expect(result).toBe(false);
    });

    it('should return false when signature header format is invalid', async () => {
      const mockReq = {
        headers: {
          signature: 'invalid-format',
          'signature-input': 'woodpecker-ci-extensions=("@request-target")',
        },
        method: 'POST',
        url: '/config',
      } as Partial<Request> as Request;

      const result = await verifyHttpMessageSignature(mockReq, 'pubkey');
      expect(result).toBe(false);
    });

    it('should return false when signature-input format is invalid', async () => {
      const mockReq = {
        headers: {
          signature: 'woodpecker-ci-extensions=:abc123:',
          'signature-input': 'invalid-format',
        },
        method: 'POST',
        url: '/config',
      } as Partial<Request> as Request;

      const result = await verifyHttpMessageSignature(mockReq, 'pubkey');
      expect(result).toBe(false);
    });

    it('should build signature base with @request-target', async () => {
      const mockReq = {
        headers: {
          signature: 'woodpecker-ci-extensions=:YWJjMTIz:',
          'signature-input': 'woodpecker-ci-extensions=("@request-target");created=1234567890',
        },
        method: 'POST',
        url: '/config',
      } as Partial<Request> as Request;

      // Will fail verification but shouldn't throw
      const result = await verifyHttpMessageSignature(mockReq, 'invalid-pubkey');
      expect(result).toBe(false);
    });

    it('should include content-digest in signature base when present', async () => {
      const mockReq = {
        headers: {
          signature: 'woodpecker-ci-extensions=:YWJjMTIz:',
          'signature-input':
            'woodpecker-ci-extensions=("@request-target" "content-digest");created=1234567890',
          'content-digest': 'sha-256=abc123',
        },
        method: 'POST',
        url: '/config',
      } as Partial<Request> as Request;

      const result = await verifyHttpMessageSignature(mockReq, 'invalid-pubkey');
      expect(result).toBe(false);
    });

    it('should handle custom headers in signature components', async () => {
      const mockReq = {
        headers: {
          signature: 'woodpecker-ci-extensions=:YWJjMTIz:',
          'signature-input':
            'woodpecker-ci-extensions=("@request-target" "x-custom-header");created=1234567890',
          'x-custom-header': 'custom-value',
        },
        method: 'POST',
        url: '/config',
      } as Partial<Request> as Request;

      const result = await verifyHttpMessageSignature(mockReq, 'invalid-pubkey');
      expect(result).toBe(false);
    });

    it('should return false for invalid ed25519 signature', async () => {
      const mockReq = {
        headers: {
          signature: 'woodpecker-ci-extensions=:YWJjMTIz:',
          'signature-input': 'woodpecker-ci-extensions=("@request-target");created=1234567890',
        },
        method: 'POST',
        url: '/config',
      } as Partial<Request> as Request;

      const result = await verifyHttpMessageSignature(
        mockReq,
        'aabbccdd'.repeat(8) // 64 hex chars
      );
      expect(result).toBe(false);
    });

    it('should return false when ed25519 verification throws', async () => {
      const mockReq = {
        headers: {
          signature: 'woodpecker-ci-extensions=:invalid-base64!@#:',
          'signature-input': 'woodpecker-ci-extensions=("@request-target");created=1234567890',
        },
        method: 'POST',
        url: '/config',
      } as Partial<Request> as Request;

      const result = await verifyHttpMessageSignature(mockReq, 'aabbccdd'.repeat(8));
      expect(result).toBe(false);
    });

    it('should handle GET requests', async () => {
      const mockReq = {
        headers: {
          signature: 'woodpecker-ci-extensions=:YWJjMTIz:',
          'signature-input': 'woodpecker-ci-extensions=("@request-target");created=1234567890',
        },
        method: 'GET',
        url: '/config',
      } as Partial<Request> as Request;

      const result = await verifyHttpMessageSignature(mockReq, 'aabbccdd'.repeat(8));
      expect(result).toBe(false);
    });

    it('should handle different URL paths', async () => {
      const mockReq = {
        headers: {
          signature: 'woodpecker-ci-extensions=:YWJjMTIz:',
          'signature-input': 'woodpecker-ci-extensions=("@request-target");created=1234567890',
        },
        method: 'POST',
        url: '/api/v1/config?param=value',
      } as Partial<Request> as Request;

      const result = await verifyHttpMessageSignature(mockReq, 'aabbccdd'.repeat(8));
      expect(result).toBe(false);
    });
  });

  describe('verifyHmacSignature', () => {
    it('should return false when x-woodpecker-signature header is missing', () => {
      const mockReq = {
        headers: {},
      } as Partial<Request> as Request;

      const result = verifyHmacSignature(mockReq, 'secret');
      expect(result).toBe(false);
    });

    it('should return false when rawBody is missing', () => {
      const mockReq = {
        headers: {
          'x-woodpecker-signature': 'sha256=abc123',
        },
      } as Partial<Request> as Request;

      const result = verifyHmacSignature(mockReq, 'secret');
      expect(result).toBe(false);
    });

    it('should verify valid HMAC signature with x-woodpecker-signature', () => {
      const body = Buffer.from('test body');
      const secret = 'test-secret';
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(body);
      const signature = `sha256=${hmac.digest('hex')}`;

      const mockReq = {
        headers: {
          'x-woodpecker-signature': signature,
        },
        rawBody: body,
      } as unknown as Request;

      const result = verifyHmacSignature(mockReq, secret);
      expect(result).toBe(true);
    });

    it('should verify valid HMAC signature with x-drone-signature', () => {
      const body = Buffer.from('test body');
      const secret = 'test-secret';
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(body);
      const signature = `sha256=${hmac.digest('hex')}`;

      const mockReq = {
        headers: {
          'x-drone-signature': signature,
        },
        rawBody: body,
      } as unknown as Request;

      const result = verifyHmacSignature(mockReq, secret);
      expect(result).toBe(true);
    });

    it('should return false for invalid HMAC signature', () => {
      const body = Buffer.from('test body');
      const secret = 'test-secret';

      const mockReq = {
        headers: {
          'x-woodpecker-signature': 'sha256=invalid-signature',
        },
        rawBody: body,
      } as unknown as Request;

      const result = verifyHmacSignature(mockReq, secret);
      expect(result).toBe(false);
    });

    it('should return false when signature does not match', () => {
      const body = Buffer.from('test body');
      const secret = 'test-secret';
      const wrongSecret = 'wrong-secret';
      const hmac = crypto.createHmac('sha256', wrongSecret);
      hmac.update(body);
      const signature = `sha256=${hmac.digest('hex')}`;

      const mockReq = {
        headers: {
          'x-woodpecker-signature': signature,
        },
        rawBody: body,
      } as unknown as Request;

      const result = verifyHmacSignature(mockReq, secret);
      expect(result).toBe(false);
    });

    it('should handle different body contents', () => {
      const body = Buffer.from(JSON.stringify({ repo: 'test', pipeline: 1 }));
      const secret = 'test-secret';
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(body);
      const signature = `sha256=${hmac.digest('hex')}`;

      const mockReq = {
        headers: {
          'x-woodpecker-signature': signature,
        },
        rawBody: body,
      } as unknown as Request;

      const result = verifyHmacSignature(mockReq, secret);
      expect(result).toBe(true);
    });

    it('should handle empty body', () => {
      const body = Buffer.from('');
      const secret = 'test-secret';
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(body);
      const signature = `sha256=${hmac.digest('hex')}`;

      const mockReq = {
        headers: {
          'x-woodpecker-signature': signature,
        },
        rawBody: body,
      } as unknown as Request;

      const result = verifyHmacSignature(mockReq, secret);
      expect(result).toBe(true);
    });

    it('should return false on exception', () => {
      const mockReq = {
        headers: {
          'x-woodpecker-signature': null,
        },
        rawBody: Buffer.from('test'),
      } as unknown as Request;

      const result = verifyHmacSignature(mockReq, 'secret');
      expect(result).toBe(false);
    });

    it('should prefer x-woodpecker-signature over x-drone-signature', () => {
      const body = Buffer.from('test body');
      const secret = 'test-secret';
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(body);
      const correctSignature = `sha256=${hmac.digest('hex')}`;

      const mockReq = {
        headers: {
          'x-woodpecker-signature': correctSignature,
          'x-drone-signature': 'sha256=wrong',
        },
        rawBody: body,
      } as unknown as Request;

      const result = verifyHmacSignature(mockReq, secret);
      expect(result).toBe(true);
    });
  });
});
