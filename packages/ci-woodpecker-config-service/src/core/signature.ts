import * as ed25519 from '@noble/ed25519';
import crypto from 'crypto';
import type { Request } from 'express';

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

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
    const signatureMatch = signatureHeader.match(/woodpecker-ci-extensions=:([^:]+):/);
    if (!signatureMatch) return false;
    const signatureBase64 = signatureMatch[1];
    const signature = Buffer.from(signatureBase64, 'base64');

    const inputMatch = signatureInputHeader.match(/woodpecker-ci-extensions=\(([^)]+)\)/);
    if (!inputMatch) return false;

    const components = inputMatch[1].split(' ').map((c) => c.replace(/"/g, ''));
    const signatureBase: string[] = [];

    for (const component of components) {
      if (component === '@request-target') {
        const method = req.method.toLowerCase();
        const path = req.url || '/';
        signatureBase.push(`"@request-target": ${method} ${path}`);
      } else if (component === 'content-digest') {
        const digest = req.headers['content-digest'] as string | undefined;
        if (digest) signatureBase.push(`"content-digest": ${digest}`);
      } else {
        const value = req.headers[component.toLowerCase()];
        if (value) signatureBase.push(`"${component}": ${value}`);
      }
    }

    const createdMatch = signatureInputHeader.match(/created=(\d+)/);
    if (createdMatch) {
      signatureBase.push(`"@signature-params": ${inputMatch[1]};created=${createdMatch[1]};alg="ed25519"`);
    }

    const message = Buffer.from(signatureBase.join('\n'), 'utf-8');
    const publicKey = hexToBytes(publicKeyHex);
    const isValid = await ed25519.verify(signature, message, publicKey);
    return isValid;
  } catch {
    return false;
  }
}

export function verifyHmacSignature(
  req: Request,
  secret: string
): boolean {
  try {
    const header = (req.headers['x-woodpecker-signature'] || req.headers['x-drone-signature']) as string | undefined;
    if (!header) return false;

    const rawBody: Buffer | undefined = (req as unknown as { rawBody?: Buffer }).rawBody;
    if (!rawBody) return false;

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(rawBody);
    const digest = `sha256=${hmac.digest('hex')}`;
    return digest === header;
  } catch {
    return false;
  }
}
