import { z } from "zod";

export const Domains = {
  ORG: "org",
  STORE_WILDCARD: "store:*",
} as const;

// === Zod Schemas ===

export const OrgDomainSchema = z.literal("org");

export const StoreWildcardDomainSchema = z.literal("store:*");

export const StoreIdDomainSchema = z
  .string()
  .regex(/^store:[a-zA-Z0-9-]+$/, "Invalid store domain format");

export const StoreDomainSchema = z.union([
  StoreWildcardDomainSchema,
  StoreIdDomainSchema,
]);

export const DomainSchema = z.union([OrgDomainSchema, StoreDomainSchema]);

export type DomainType = "org" | "store" | "store-wildcard";
