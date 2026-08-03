import type {
  CdnConfiguration,
  CdnRoutingRule,
} from "../../repositories/models/index.js";

export interface CdnNormalizedTransform {
  crop?: string;
  height?: number;
  width?: number;
  format?: string;
  scale?: number;
  quality?: number;
}

export interface CdnAdapterContext {
  configuration: CdnConfiguration;
  routingRule: CdnRoutingRule | null;
  objectPath: string;
  transform: CdnNormalizedTransform;
  url: string;
}

export type CdnTransformAdapter = (
  context: CdnAdapterContext
) => string | Promise<string>;

/**
 * Signing adapters receive only a secret reference. Resolving the referenced
 * secret remains the responsibility of the external adapter/runtime.
 */
export type CdnSigningAdapter = (
  context: CdnAdapterContext
) => string | Promise<string>;

export class CdnAdapterRegistry {
  private readonly transformAdapters = new Map<string, CdnTransformAdapter>();
  private readonly signingAdapters = new Map<string, CdnSigningAdapter>();

  registerTransform(key: string, adapter: CdnTransformAdapter): () => void {
    const normalizedKey = this.normalizeKey(key);
    this.transformAdapters.set(normalizedKey, adapter);
    return () => {
      if (this.transformAdapters.get(normalizedKey) === adapter) {
        this.transformAdapters.delete(normalizedKey);
      }
    };
  }

  registerSigning(key: string, adapter: CdnSigningAdapter): () => void {
    const normalizedKey = this.normalizeKey(key);
    this.signingAdapters.set(normalizedKey, adapter);
    return () => {
      if (this.signingAdapters.get(normalizedKey) === adapter) {
        this.signingAdapters.delete(normalizedKey);
      }
    };
  }

  getTransform(key: string): CdnTransformAdapter | null {
    return this.transformAdapters.get(this.normalizeKey(key)) ?? null;
  }

  getSigning(key: string): CdnSigningAdapter | null {
    return this.signingAdapters.get(this.normalizeKey(key)) ?? null;
  }

  private normalizeKey(key: string): string {
    return key.trim().toLowerCase();
  }
}

export const cdnAdapterRegistry = new CdnAdapterRegistry();
