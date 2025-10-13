import * as ed25519 from '@noble/ed25519';
import crypto from 'crypto';
import type { Request } from 'express';

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Verify HTTP Message Signature (RFC 9421) with ed25519
 */
export async function verifyHttpMessageSignature(
  req: Request,
  publicKeyHex: string
): Promise<boolean> {
  try {
    const signatureHeader = req.headers['signature'] as string | undefined;
    const signatureInputHeader = req.headers['signature-input'] as string | undefined;

    if (!signatureHeader || !signatureInputHeader) {
      return false;
    }

    // Parse signature header: woodpecker-ci-extensions=:base64signature:
    const signatureMatch = signatureHeader.match(/woodpecker-ci-extensions=:([^:]+):/);
    if (!signatureMatch) {
      return false;
    }
    const signatureBase64 = signatureMatch[1];
    const signature = Buffer.from(signatureBase64, 'base64');

    // Parse signature-input to get covered components
    // Example: woodpecker-ci-extensions=("@request-target" "content-digest");created=1760371194;alg="ed25519"
    const inputMatch = signatureInputHeader.match(/woodpecker-ci-extensions=\(([^)]+)\)/);
    if (!inputMatch) {
      return false;
    }

    // Build signature base according to RFC 9421
    const components = inputMatch[1].split(' ').map((c) => c.replace(/"/g, ''));
    const signatureBase: string[] = [];

    for (const component of components) {
      if (component === '@request-target') {
        // @request-target: method path
        const method = req.method.toLowerCase();
        const path = req.url || '/';
        signatureBase.push(`"@request-target": ${method} ${path}`);
      } else if (component === 'content-digest') {
        const digest = req.headers['content-digest'] as string | undefined;
        if (digest) {
          signatureBase.push(`"content-digest": ${digest}`);
        }
      } else {
        // Other headers
        const value = req.headers[component.toLowerCase()];
        if (value) {
          signatureBase.push(`"${component}": ${value}`);
        }
      }
    }

    // Add signature params
    const createdMatch = signatureInputHeader.match(/created=(\d+)/);
    if (createdMatch) {
      signatureBase.push(`"@signature-params": ${inputMatch[1]};created=${createdMatch[1]};alg="ed25519"`);
    }

    const signatureBaseString = signatureBase.join('\n');
    const message = Buffer.from(signatureBaseString, 'utf-8');

    // Verify ed25519 signature
    const publicKey = hexToBytes(publicKeyHex);
    const isValid = await ed25519.verify(signature, message, publicKey);

    return isValid;
  } catch (error) {
    return false;
  }
}

/**
 * Verify legacy HMAC signature (x-woodpecker-signature or x-drone-signature)
 */
export function verifyHmacSignature(
  req: Request,
  secret: string
): boolean {
  try {
    const header = (req.headers['x-woodpecker-signature'] || req.headers['x-drone-signature']) as string | undefined;
    if (!header) {
      return false;
    }

    const rawBody: Buffer | undefined = (req as unknown as { rawBody?: Buffer }).rawBody;
    if (!rawBody) {
      return false;
    }

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(rawBody);
    const digest = `sha256=${hmac.digest('hex')}`;

    return digest === header;
  } catch (error) {
    return false;
  }
}
