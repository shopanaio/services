/**
 * Import data from Casdoor export to PostgreSQL
 *
 * Usage:
 *   DATABASE_URL=postgres://... npx tsx scripts/import-to-postgres.ts
 *
 * Prerequisites:
 *   1. Run database migrations first
 *   2. Have casdoor-export.json ready
 */

import fs from "fs/promises";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  tenant,
  role,
  userRole,
  casbinRule,
} from "../src/db/schema/authorization.js";

// Types for exported data
interface ExportedData {
  tenants: Array<{
    slug: string;
    name: string;
  }>;
  roles: Array<{
    tenantSlug: string;
    name: string;
    displayName: string;
    description: string;
    isSystem: boolean;
  }>;
  userRoles: Array<{
    tenantSlug: string;
    userId: string;
    roleName: string;
  }>;
  policies: Array<{
    tenantSlug: string;
    role: string;
    resource: string;
    action: string;
    effect: "allow" | "deny";
  }>;
  roleHierarchy: Array<{
    tenantSlug: string;
    parentRole: string;
    childRole: string;
  }>;
}

async function importData(data: ExportedData) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  console.log("[Import] Connecting to database...");
  const client = postgres(databaseUrl);
  const db = drizzle(client);

  try {
    // Maps to track created IDs
    const tenantMap = new Map<string, string>(); // slug -> id
    const roleMap = new Map<string, string>(); // tenantSlug:roleName -> id

    // 1. Create tenants
    console.log(`[Import] Creating ${data.tenants.length} tenants...`);
    for (const t of data.tenants) {
      const [result] = await db
        .insert(tenant)
        .values({
          slug: t.slug,
          name: t.name,
        })
        .returning();
      tenantMap.set(t.slug, result.id);
      console.log(`[Import]   Created tenant: ${t.slug} (${result.id})`);
    }

    // 2. Create roles
    console.log(`[Import] Creating ${data.roles.length} roles...`);
    for (const r of data.roles) {
      const tenantId = tenantMap.get(r.tenantSlug);
      if (!tenantId) {
        console.warn(`[Import]   Skipping role ${r.name}: tenant ${r.tenantSlug} not found`);
        continue;
      }

      const [result] = await db
        .insert(role)
        .values({
          tenantId,
          name: r.name,
          displayName: r.displayName,
          description: r.description,
          isSystem: r.isSystem,
        })
        .returning();
      roleMap.set(`${r.tenantSlug}:${r.name}`, result.id);
      console.log(`[Import]   Created role: ${r.tenantSlug}/${r.name}`);
    }

    // 3. Create user-role mappings
    console.log(`[Import] Creating ${data.userRoles.length} user-role mappings...`);
    for (const ur of data.userRoles) {
      const tenantId = tenantMap.get(ur.tenantSlug);
      const roleId = roleMap.get(`${ur.tenantSlug}:${ur.roleName}`);

      if (!tenantId || !roleId) {
        console.warn(`[Import]   Skipping user-role: tenant or role not found for ${ur.tenantSlug}/${ur.roleName}`);
        continue;
      }

      await db.insert(userRole).values({
        tenantId,
        userId: ur.userId,
        roleId,
      });
      console.log(`[Import]   Assigned ${ur.userId} -> ${ur.roleName} in ${ur.tenantSlug}`);
    }

    // 4. Create casbin policies
    console.log(`[Import] Creating ${data.policies.length} policies...`);
    for (const p of data.policies) {
      const tenantId = tenantMap.get(p.tenantSlug);
      if (!tenantId) {
        console.warn(`[Import]   Skipping policy: tenant ${p.tenantSlug} not found`);
        continue;
      }

      await db.insert(casbinRule).values({
        ptype: "p",
        v0: p.role,
        v1: p.resource,
        v2: p.action,
        v3: p.effect,
        v4: tenantId,
      });
    }
    console.log(`[Import]   Created ${data.policies.length} policies`);

    // 5. Create role hierarchy (grouping policies)
    console.log(`[Import] Creating ${data.roleHierarchy.length} role hierarchy entries...`);
    for (const h of data.roleHierarchy) {
      const tenantId = tenantMap.get(h.tenantSlug);
      if (!tenantId) {
        console.warn(`[Import]   Skipping hierarchy: tenant ${h.tenantSlug} not found`);
        continue;
      }

      await db.insert(casbinRule).values({
        ptype: "g",
        v0: h.parentRole,
        v1: h.childRole,
        v2: tenantId,
      });
    }
    console.log(`[Import]   Created ${data.roleHierarchy.length} hierarchy entries`);

    // 6. Create user-role groupings (for Casbin enforcement)
    console.log(`[Import] Creating ${data.userRoles.length} user-role groupings...`);
    for (const ur of data.userRoles) {
      const tenantId = tenantMap.get(ur.tenantSlug);
      if (!tenantId) continue;

      await db.insert(casbinRule).values({
        ptype: "g",
        v0: ur.userId,
        v1: ur.roleName,
        v2: tenantId,
      });
    }
    console.log(`[Import]   Created ${data.userRoles.length} user-role groupings`);

    console.log("[Import] Import completed successfully!");
  } finally {
    await client.end();
  }
}

async function main() {
  try {
    const inputPath = process.argv[2] || "./casdoor-export.json";

    console.log(`[Import] Reading data from ${inputPath}...`);
    const content = await fs.readFile(inputPath, "utf-8");
    const data: ExportedData = JSON.parse(content);

    console.log("[Import] Data summary:");
    console.log(`[Import]   Tenants: ${data.tenants.length}`);
    console.log(`[Import]   Roles: ${data.roles.length}`);
    console.log(`[Import]   User-Role mappings: ${data.userRoles.length}`);
    console.log(`[Import]   Policies: ${data.policies.length}`);
    console.log(`[Import]   Role hierarchy: ${data.roleHierarchy.length}`);

    await importData(data);
  } catch (error) {
    console.error("[Import] Error:", error);
    process.exit(1);
  }
}

main();
