/**
 * Mock data for workspace domain (organization, users, team members, roles)
 * Using API types from GraphQL schema
 */

import {
  LocaleCode,
  type ApiOrganization,
  type ApiUser,
  type ApiMember,
  type ApiRole,
  type ApiRolePermission,
} from "@/graphql/types";

// Organization mock data
export const mockOrganization: ApiOrganization = {
  __typename: "Organization",
  id: "org-1",
  name: "acme-corp",
  displayName: "Acme Corporation",
  createdAt: "2024-01-15T00:00:00Z",
  membership: {
    __typename: "Membership",
    domain: "org",
    organizationId: "org-1",
    members: [],
    roles: [],
  },
};

// User mock data
export const mockCurrentUser: ApiUser = {
  __typename: "User",
  id: "user-1",
  email: "john.doe@acme.com" as any,
  firstName: "John",
  lastName: "Doe",
  avatar: null,
  isAdmin: true,
  emailVerified: true,
  createdAt: "2024-01-15T00:00:00Z",
  updatedAt: "2024-06-01T00:00:00Z",
  locale: "en_US" as any,
  isDeleted: false,
  isForbidden: false,
};

// Role permissions mock data
const adminPermissions: ApiRolePermission[] = [
  { __typename: "RolePermission", resource: "org.profile", actions: ["read", "write"] },
  { __typename: "RolePermission", resource: "org.members", actions: ["read", "write"] },
  { __typename: "RolePermission", resource: "store.products", actions: ["read", "write", "admin"] },
  { __typename: "RolePermission", resource: "store.orders", actions: ["read", "write", "admin"] },
  { __typename: "RolePermission", resource: "store.inventory", actions: ["read", "write", "admin"] },
];

const editorPermissions: ApiRolePermission[] = [
  { __typename: "RolePermission", resource: "org.profile", actions: ["read"] },
  { __typename: "RolePermission", resource: "org.members", actions: ["read"] },
  { __typename: "RolePermission", resource: "store.products", actions: ["read", "write"] },
  { __typename: "RolePermission", resource: "store.orders", actions: ["read"] },
  { __typename: "RolePermission", resource: "store.inventory", actions: ["read", "write"] },
];

const viewerPermissions: ApiRolePermission[] = [
  { __typename: "RolePermission", resource: "org.profile", actions: ["read"] },
  { __typename: "RolePermission", resource: "org.members", actions: ["read"] },
  { __typename: "RolePermission", resource: "store.products", actions: ["read"] },
  { __typename: "RolePermission", resource: "store.orders", actions: ["read"] },
  { __typename: "RolePermission", resource: "store.inventory", actions: ["read"] },
];

// Roles mock data
export const mockRoles: ApiRole[] = [
  {
    __typename: "Role",
    id: "role-admin",
    name: "admin",
    displayName: "Admin",
    description: "Organization management access",
    domain: "org",
    isSystem: true,
    permissions: adminPermissions,
    createdAt: "2024-01-15T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
  },
  {
    __typename: "Role",
    id: "role-editor",
    name: "editor",
    displayName: "Editor",
    description: "Content editing permissions",
    domain: "org",
    isSystem: true,
    permissions: editorPermissions,
    createdAt: "2024-01-15T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
  },
  {
    __typename: "Role",
    id: "role-viewer",
    name: "viewer",
    displayName: "Viewer",
    description: "Read-only access",
    domain: "org",
    isSystem: true,
    permissions: viewerPermissions,
    createdAt: "2024-01-15T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
  },
];

// Team members mock data
export const mockMembers: ApiMember[] = [
  {
    __typename: "Member",
    id: "member-1",
    user: mockCurrentUser,
    role: "admin",
    isOwner: false,
    grantedAt: "2024-01-15T00:00:00Z",
    grantedBy: null,
  },
  {
    __typename: "Member",
    id: "member-2",
    user: {
      __typename: "User",
      id: "user-2",
      email: "jane.smith@acme.com" as any,
      firstName: "Jane",
      lastName: "Smith",
      avatar: null,
      isAdmin: true,
      emailVerified: true,
      createdAt: "2024-02-01T00:00:00Z",
      updatedAt: "2024-05-15T00:00:00Z",
      locale: "en_US" as any,
      isDeleted: false,
      isForbidden: false,
    },
    role: "admin",
    isOwner: false,
    grantedAt: "2024-02-01T00:00:00Z",
    grantedBy: mockCurrentUser,
  },
  {
    __typename: "Member",
    id: "member-3",
    user: {
      __typename: "User",
      id: "user-3",
      email: "bob.wilson@acme.com" as any,
      firstName: "Bob",
      lastName: "Wilson",
      avatar: null,
      isAdmin: false,
      emailVerified: true,
      createdAt: "2024-03-10T00:00:00Z",
      updatedAt: "2024-06-01T00:00:00Z",
      locale: "en_US" as any,
      isDeleted: false,
      isForbidden: false,
    },
    role: "editor",
    isOwner: false,
    grantedAt: "2024-03-10T00:00:00Z",
    grantedBy: mockCurrentUser,
  },
  {
    __typename: "Member",
    id: "member-4",
    user: {
      __typename: "User",
      id: "user-4",
      email: "alice.johnson@acme.com" as any,
      firstName: "Alice",
      lastName: "Johnson",
      avatar: null,
      isAdmin: false,
      emailVerified: true,
      createdAt: "2024-04-20T00:00:00Z",
      updatedAt: "2024-05-30T00:00:00Z",
      locale: "en_US" as any,
      isDeleted: false,
      isForbidden: false,
    },
    role: "viewer",
    isOwner: false,
    grantedAt: "2024-04-20T00:00:00Z",
    grantedBy: mockCurrentUser,
  },
];

// Sessions mock data (local type - no API equivalent)
export interface ISession {
  id: string;
  device: string;
  browser: string;
  os: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export const mockSessions: ISession[] = [
  {
    id: "session-1",
    device: "desktop",
    browser: "Chrome",
    os: "macOS",
    location: "San Francisco, US",
    lastActive: new Date().toISOString(),
    isCurrent: true,
  },
  {
    id: "session-2",
    device: "mobile",
    browser: "Safari",
    os: "iPhone",
    location: "New York, US",
    lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isCurrent: false,
  },
];

// Locale options
export const localeOptions = [
  { value: LocaleCode.En, label: "English" },
  { value: LocaleCode.Ru, label: "Russian" },
  { value: LocaleCode.De, label: "German" },
  { value: LocaleCode.Fr, label: "French" },
  { value: LocaleCode.Es, label: "Spanish" },
];

// Timezone options
export const timezoneOptions = [
  { value: "UTC", label: "UTC+00:00" },
  { value: "America/New_York", label: "EST (UTC-05:00)" },
  { value: "America/Los_Angeles", label: "PST (UTC-08:00)" },
  { value: "Europe/London", label: "GMT (UTC+00:00)" },
  { value: "Europe/Moscow", label: "MSK (UTC+03:00)" },
  { value: "Asia/Tokyo", label: "JST (UTC+09:00)" },
];

// Date format options
export const dateFormatOptions = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
];

// Helper function to get role by name
export function getRoleByName(roleName: string): ApiRole | undefined {
  return mockRoles.find((r) => r.name === roleName);
}

// Helper function to get user display name
export function getUserDisplayName(user: ApiUser): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  return user.firstName || user.lastName || String(user.email);
}
