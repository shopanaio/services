import { describe, it, expect } from "@jest/globals";
import { DomainPermissionsSchema } from "../validators.js";

describe("DomainPermissionsSchema", () => {
  /**
   * Validation hierarchy:
   * 1. Domain must be valid ("org" or "store:<uuid>")
   * 2. Resource must be valid for that domain
   * 3. Actions must be valid for that resource
   * 4. Arrays must not be empty
   */

  // Valid UUID for testing
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";
  const validStoreDomain = `store:${validUuid}`;

  describe("1. Domain validation", () => {
    it("should accept valid domain: org", () => {
      const result = DomainPermissionsSchema.safeParse({
        domain: "org",
        permissions: [{ resource: "org.profile", actions: ["read"] }],
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid domain: store:<uuid>", () => {
      const result = DomainPermissionsSchema.safeParse({
        domain: validStoreDomain,
        permissions: [{ resource: "store.profile", actions: ["read"] }],
      });
      expect(result.success).toBe(true);
    });

    it("should accept store domain with uppercase UUID", () => {
      const result = DomainPermissionsSchema.safeParse({
        domain: "store:550E8400-E29B-41D4-A716-446655440000",
        permissions: [{ resource: "store.profile", actions: ["read"] }],
      });
      expect(result.success).toBe(true);
    });

    it("should reject plain 'store' without UUID", () => {
      const result = DomainPermissionsSchema.safeParse({
        domain: "store",
        permissions: [{ resource: "store.profile", actions: ["read"] }],
      });
      expect(result.success).toBe(false);
    });

    it("should reject store with invalid UUID format", () => {
      const result = DomainPermissionsSchema.safeParse({
        domain: "store:invalid-uuid",
        permissions: [{ resource: "store.profile", actions: ["read"] }],
      });
      expect(result.success).toBe(false);
    });

    it("should reject store with incomplete UUID", () => {
      const result = DomainPermissionsSchema.safeParse({
        domain: "store:550e8400-e29b-41d4",
        permissions: [{ resource: "store.profile", actions: ["read"] }],
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid domain", () => {
      const result = DomainPermissionsSchema.safeParse({
        domain: "invalid",
        permissions: [{ resource: "org.profile", actions: ["read"] }],
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing domain", () => {
      const result = DomainPermissionsSchema.safeParse({
        permissions: [{ resource: "org.profile", actions: ["read"] }],
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty string domain", () => {
      const result = DomainPermissionsSchema.safeParse({
        domain: "",
        permissions: [{ resource: "org.profile", actions: ["read"] }],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("2. Resource validation for domain", () => {
    describe("org domain resources", () => {
      const validOrgResources = [
        "org.profile",
        "org.members",
        "org.roles",
        "org.stores",
        "org.access",
      ];

      it.each(validOrgResources)("should accept valid org resource: %s", (resource) => {
        const result = DomainPermissionsSchema.safeParse({
          domain: "org",
          permissions: [{ resource, actions: ["read"] }],
        });
        expect(result.success).toBe(true);
      });

      it("should reject store resource in org domain", () => {
        const result = DomainPermissionsSchema.safeParse({
          domain: "org",
          permissions: [{ resource: "store.profile", actions: ["read"] }],
        });
        expect(result.success).toBe(false);
      });

      it("should reject non-existent org resource", () => {
        const result = DomainPermissionsSchema.safeParse({
          domain: "org",
          permissions: [{ resource: "org.nonexistent", actions: ["read"] }],
        });
        expect(result.success).toBe(false);
      });

      it("should reject resource without domain prefix", () => {
        const result = DomainPermissionsSchema.safeParse({
          domain: "org",
          permissions: [{ resource: "profile", actions: ["read"] }],
        });
        expect(result.success).toBe(false);
      });
    });

    describe("store domain resources", () => {
      const validStoreResources = [
        "store.profile",
        "store.members",
        "store.roles",
        "store.access",
      ];

      it.each(validStoreResources)("should accept valid store resource: %s", (resource) => {
        const result = DomainPermissionsSchema.safeParse({
          domain: validStoreDomain,
          permissions: [{ resource, actions: ["read"] }],
        });
        expect(result.success).toBe(true);
      });

      it("should reject org resource in store domain", () => {
        const result = DomainPermissionsSchema.safeParse({
          domain: validStoreDomain,
          permissions: [{ resource: "org.profile", actions: ["read"] }],
        });
        expect(result.success).toBe(false);
      });

      it("should reject non-existent store resource", () => {
        const result = DomainPermissionsSchema.safeParse({
          domain: validStoreDomain,
          permissions: [{ resource: "store.nonexistent", actions: ["read"] }],
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe("3. Action validation for resource", () => {
    describe("org.profile actions", () => {
      const validActions = ["read", "update", "delete"];

      it.each(validActions)("should accept valid action: %s", (action) => {
        const result = DomainPermissionsSchema.safeParse({
          domain: "org",
          permissions: [{ resource: "org.profile", actions: [action] }],
        });
        expect(result.success).toBe(true);
      });

      it("should accept all valid actions together", () => {
        const result = DomainPermissionsSchema.safeParse({
          domain: "org",
          permissions: [{ resource: "org.profile", actions: ["read", "update", "delete"] }],
        });
        expect(result.success).toBe(true);
      });

      it("should reject action from different resource (invite belongs to org.members)", () => {
        const result = DomainPermissionsSchema.safeParse({
          domain: "org",
          permissions: [{ resource: "org.profile", actions: ["invite"] }],
        });
        expect(result.success).toBe(false);
      });

      it("should reject non-existent action", () => {
        const result = DomainPermissionsSchema.safeParse({
          domain: "org",
          permissions: [{ resource: "org.profile", actions: ["nonexistent"] }],
        });
        expect(result.success).toBe(false);
      });
    });

    describe("org.members actions", () => {
      const validActions = ["read", "invite", "update", "remove"];

      it.each(validActions)("should accept valid action: %s", (action) => {
        const result = DomainPermissionsSchema.safeParse({
          domain: "org",
          permissions: [{ resource: "org.members", actions: [action] }],
        });
        expect(result.success).toBe(true);
      });

      it("should reject action from different resource (delete belongs to org.profile)", () => {
        const result = DomainPermissionsSchema.safeParse({
          domain: "org",
          permissions: [{ resource: "org.members", actions: ["delete"] }],
        });
        expect(result.success).toBe(false);
      });
    });

    describe("org.roles actions", () => {
      const validActions = ["read", "create", "update", "delete"];

      it.each(validActions)("should accept valid action: %s", (action) => {
        const result = DomainPermissionsSchema.safeParse({
          domain: "org",
          permissions: [{ resource: "org.roles", actions: [action] }],
        });
        expect(result.success).toBe(true);
      });
    });

    describe("org.stores actions", () => {
      const validActions = ["create", "read", "list", "update", "delete"];

      it.each(validActions)("should accept valid action: %s", (action) => {
        const result = DomainPermissionsSchema.safeParse({
          domain: "org",
          permissions: [{ resource: "org.stores", actions: [action] }],
        });
        expect(result.success).toBe(true);
      });

      it("should reject action not in org.stores (invite)", () => {
        const result = DomainPermissionsSchema.safeParse({
          domain: "org",
          permissions: [{ resource: "org.stores", actions: ["invite"] }],
        });
        expect(result.success).toBe(false);
      });
    });

    describe("org.access actions", () => {
      const validActions = ["read", "grant", "revoke"];

      it.each(validActions)("should accept valid action: %s", (action) => {
        const result = DomainPermissionsSchema.safeParse({
          domain: "org",
          permissions: [{ resource: "org.access", actions: [action] }],
        });
        expect(result.success).toBe(true);
      });
    });

    describe("store.profile actions", () => {
      const validActions = ["read", "update", "delete"];

      it.each(validActions)("should accept valid action: %s", (action) => {
        const result = DomainPermissionsSchema.safeParse({
          domain: validStoreDomain,
          permissions: [{ resource: "store.profile", actions: [action] }],
        });
        expect(result.success).toBe(true);
      });

      it("should reject action not in store.profile (create)", () => {
        const result = DomainPermissionsSchema.safeParse({
          domain: validStoreDomain,
          permissions: [{ resource: "store.profile", actions: ["create"] }],
        });
        expect(result.success).toBe(false);
      });
    });

    describe("store.members actions", () => {
      const validActions = ["read", "invite", "update", "remove"];

      it.each(validActions)("should accept valid action: %s", (action) => {
        const result = DomainPermissionsSchema.safeParse({
          domain: validStoreDomain,
          permissions: [{ resource: "store.members", actions: [action] }],
        });
        expect(result.success).toBe(true);
      });
    });

    describe("store.roles actions", () => {
      const validActions = ["read", "create", "update", "delete"];

      it.each(validActions)("should accept valid action: %s", (action) => {
        const result = DomainPermissionsSchema.safeParse({
          domain: validStoreDomain,
          permissions: [{ resource: "store.roles", actions: [action] }],
        });
        expect(result.success).toBe(true);
      });
    });

    describe("store.access actions", () => {
      const validActions = ["read", "grant", "revoke"];

      it.each(validActions)("should accept valid action: %s", (action) => {
        const result = DomainPermissionsSchema.safeParse({
          domain: validStoreDomain,
          permissions: [{ resource: "store.access", actions: [action] }],
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe("4. Non-empty validation", () => {
    describe("permissions array must not be empty", () => {
      it("should reject empty permissions array for org domain", () => {
        const result = DomainPermissionsSchema.safeParse({
          domain: "org",
          permissions: [],
        });
        expect(result.success).toBe(false);
      });

      it("should reject empty permissions array for store domain", () => {
        const result = DomainPermissionsSchema.safeParse({
          domain: validStoreDomain,
          permissions: [],
        });
        expect(result.success).toBe(false);
      });

      it("should accept single permission", () => {
        const result = DomainPermissionsSchema.safeParse({
          domain: "org",
          permissions: [{ resource: "org.profile", actions: ["read"] }],
        });
        expect(result.success).toBe(true);
      });

      it("should accept multiple permissions", () => {
        const result = DomainPermissionsSchema.safeParse({
          domain: "org",
          permissions: [
            { resource: "org.profile", actions: ["read"] },
            { resource: "org.members", actions: ["read", "invite"] },
          ],
        });
        expect(result.success).toBe(true);
      });
    });

    describe("actions array must not be empty", () => {
      it("should reject empty actions array for org resource", () => {
        const result = DomainPermissionsSchema.safeParse({
          domain: "org",
          permissions: [{ resource: "org.profile", actions: [] }],
        });
        expect(result.success).toBe(false);
      });

      it("should reject empty actions array for store resource", () => {
        const result = DomainPermissionsSchema.safeParse({
          domain: validStoreDomain,
          permissions: [{ resource: "store.profile", actions: [] }],
        });
        expect(result.success).toBe(false);
      });

      it("should accept single action", () => {
        const result = DomainPermissionsSchema.safeParse({
          domain: "org",
          permissions: [{ resource: "org.profile", actions: ["read"] }],
        });
        expect(result.success).toBe(true);
      });

      it("should accept multiple actions", () => {
        const result = DomainPermissionsSchema.safeParse({
          domain: "org",
          permissions: [{ resource: "org.members", actions: ["read", "invite", "update", "remove"] }],
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe("Edge cases", () => {
    it("should reject null input", () => {
      const result = DomainPermissionsSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it("should reject undefined input", () => {
      const result = DomainPermissionsSchema.safeParse(undefined);
      expect(result.success).toBe(false);
    });

    it("should reject non-object input", () => {
      const result = DomainPermissionsSchema.safeParse("invalid");
      expect(result.success).toBe(false);
    });

    it("should reject permission with missing resource", () => {
      const result = DomainPermissionsSchema.safeParse({
        domain: "org",
        permissions: [{ actions: ["read"] }],
      });
      expect(result.success).toBe(false);
    });

    it("should reject permission with missing actions", () => {
      const result = DomainPermissionsSchema.safeParse({
        domain: "org",
        permissions: [{ resource: "org.profile" }],
      });
      expect(result.success).toBe(false);
    });

    it("should allow duplicate actions (schema does not enforce uniqueness)", () => {
      const result = DomainPermissionsSchema.safeParse({
        domain: "org",
        permissions: [{ resource: "org.profile", actions: ["read", "read"] }],
      });
      expect(result.success).toBe(true);
    });

    it("should reject if one valid action mixed with invalid action", () => {
      const result = DomainPermissionsSchema.safeParse({
        domain: "org",
        permissions: [{ resource: "org.profile", actions: ["read", "invalid"] }],
      });
      expect(result.success).toBe(false);
    });

    it("should reject if one valid permission mixed with invalid permission", () => {
      const result = DomainPermissionsSchema.safeParse({
        domain: "org",
        permissions: [
          { resource: "org.profile", actions: ["read"] },
          { resource: "org.invalid", actions: ["read"] },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("should work with different valid UUIDs for store domain", () => {
      const uuids = [
        "550e8400-e29b-41d4-a716-446655440000",
        "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      ];

      uuids.forEach((uuid) => {
        const result = DomainPermissionsSchema.safeParse({
          domain: `store:${uuid}`,
          permissions: [{ resource: "store.profile", actions: ["read"] }],
        });
        expect(result.success).toBe(true);
      });
    });
  });
});
