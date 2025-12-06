import type { ProductCreateInput } from "../generated/types.js";
import { randomUUID } from "crypto";

// In-memory storage for dummy products (for testing purposes)
// TODO: Remove when real database integration is complete
export const dummyProducts = new Map<string, DummyProduct>();
export const dummyVariants = new Map<string, DummyVariant>();

export interface DummyProduct {
  id: string;
  title: string;
  description: { text: string; html: string; json: Record<string, unknown> } | null;
  excerpt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  isPublished: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface DummyVariant {
  id: string;
  productId: string;
  title: string | null;
  sku: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function createDummyProduct(input: ProductCreateInput): DummyProduct {
  const now = new Date();
  return {
    id: randomUUID(),
    title: input.title,
    description: input.description ?? null,
    excerpt: input.excerpt ?? null,
    seoTitle: input.seoTitle ?? null,
    seoDescription: input.seoDescription ?? null,
    isPublished: input.publish ?? false,
    publishedAt: input.publish ? now : null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

export function createDummyVariant(
  productId: string,
  input?: { title?: string | null; sku?: string | null }
): DummyVariant {
  const now = new Date();
  return {
    id: randomUUID(),
    productId,
    title: input?.title ?? null,
    sku: input?.sku ?? null,
    createdAt: now,
    updatedAt: now,
  };
}
