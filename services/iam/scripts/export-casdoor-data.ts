/**
 * Export data from Casdoor for migration to node-casbin
 *
 * Usage:
 *   npx tsx scripts/export-casdoor-data.ts
 *
 * Output:
 *   Creates casdoor-export.json with all authorization data
 */

import fs from "fs/promises";

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

// Predefined roles that are considered system roles
const SYSTEM_ROLES = ["owner", "admin", "manager", "support", "viewer"];

/**
 * Export data from Casdoor
 *
 * Note: This is a template. You need to configure and use the actual
 * Casdoor SDK client to fetch data from your Casdoor instance.
 */
async function exportCasdoorData(): Promise<ExportedData> {
  const data: ExportedData = {
    tenants: [],
    roles: [],
    userRoles: [],
    policies: [],
    roleHierarchy: [],
  };

  console.log("[Export] Starting Casdoor data export...");
  console.log("[Export] Note: Configure Casdoor client in this script to fetch actual data");

  // TODO: Initialize Casdoor client
  // const client = new CasdoorNodeClient({
  //   endpoint: process.env.CASDOOR_ENDPOINT,
  //   clientId: process.env.CASDOOR_CLIENT_ID,
  //   clientSecret: process.env.CASDOOR_CLIENT_SECRET,
  //   ...
  // });

  // Example: How to fetch and transform data
  //
  // 1. Get all organizations (tenants)
  // const orgs = await client.sdk.getOrganizations();
  // const tenantOrgs = orgs.data?.data?.filter(o => o.name.startsWith('org-')) ?? [];
  //
  // for (const org of tenantOrgs) {
  //   const slug = org.name.replace('org-', '');
  //   data.tenants.push({ slug, name: org.displayName ?? slug });
  //
  //   // 2. Get roles for this tenant
  //   const allRoles = await client.sdk.getRoles();
  //   const tenantRoles = allRoles.data?.data?.filter(r => r.owner === org.name) ?? [];
  //
  //   for (const role of tenantRoles) {
  //     data.roles.push({
  //       tenantSlug: slug,
  //       name: role.name,
  //       displayName: role.displayName ?? role.name,
  //       description: role.description ?? '',
  //       isSystem: SYSTEM_ROLES.includes(role.name),
  //     });
  //
  //     // 3. User-role mappings
  //     for (const userFullName of role.users ?? []) {
  //       const userId = userFullName.split('/').pop()!;
  //       data.userRoles.push({
  //         tenantSlug: slug,
  //         userId,
  //         roleName: role.name,
  //       });
  //     }
  //
  //     // 4. Role hierarchy (sub-roles)
  //     for (const childRoleFullName of role.roles ?? []) {
  //       const childRole = childRoleFullName.split('/').pop()!;
  //       data.roleHierarchy.push({
  //         tenantSlug: slug,
  //         parentRole: role.name,
  //         childRole,
  //       });
  //     }
  //   }
  //
  //   // 5. Permissions (policies)
  //   const allPermissions = await client.sdk.getPermissions();
  //   const tenantPerms = allPermissions.data?.data?.filter(p => p.owner === org.name) ?? [];
  //
  //   for (const perm of tenantPerms) {
  //     const roleName = perm.roles?.[0]?.split('/').pop();
  //     if (!roleName) continue;
  //
  //     for (const resource of perm.resources ?? []) {
  //       for (const action of perm.actions ?? []) {
  //         data.policies.push({
  //           tenantSlug: slug,
  //           role: roleName,
  //           resource,
  //           action,
  //           effect: perm.effect?.toLowerCase() === 'deny' ? 'deny' : 'allow',
  //         });
  //       }
  //     }
  //   }
  // }

  console.log("[Export] Export completed");
  console.log(`[Export] Tenants: ${data.tenants.length}`);
  console.log(`[Export] Roles: ${data.roles.length}`);
  console.log(`[Export] User-Role mappings: ${data.userRoles.length}`);
  console.log(`[Export] Policies: ${data.policies.length}`);
  console.log(`[Export] Role hierarchy: ${data.roleHierarchy.length}`);

  return data;
}

async function main() {
  try {
    const data = await exportCasdoorData();

    const outputPath = "./casdoor-export.json";
    await fs.writeFile(outputPath, JSON.stringify(data, null, 2));

    console.log(`[Export] Data saved to ${outputPath}`);
  } catch (error) {
    console.error("[Export] Error:", error);
    process.exit(1);
  }
}

main();
