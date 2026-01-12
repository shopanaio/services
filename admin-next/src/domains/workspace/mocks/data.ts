/**
 * Mock data for workspace domain (organization, users, team members, roles)
 */

// Organization mock data
export interface IOrganization {
  id: string;
  name: string;
  displayName: string;
  logo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const mockOrganization: IOrganization = {
  id: "org-1",
  name: "acme-corp",
  displayName: "Acme Corporation",
  logo: undefined,
  createdAt: new Date("2024-01-15"),
  updatedAt: new Date("2024-06-01"),
};

// User mock data
export interface IUser {
  id: string;
  email: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  admin: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  locale?: string;
}

export const mockCurrentUser: IUser = {
  id: "user-1",
  email: "john.doe@acme.com",
  name: "John Doe",
  firstName: "John",
  lastName: "Doe",
  image: null,
  admin: true,
  emailVerified: true,
  createdAt: new Date("2024-01-15"),
  updatedAt: new Date("2024-06-01"),
  locale: "en-US",
};

// Team members mock data
export interface IMember {
  id: string;
  user: IUser;
  role: IRole;
  joinedAt: Date;
}

export interface IRole {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  memberCount: number;
  permissions: IPermission[];
}

export interface IPermission {
  resource: string;
  read: boolean;
  write: boolean;
  admin: boolean;
}

export const mockRoles: IRole[] = [
  {
    id: "role-owner",
    name: "Owner",
    description: "Full access · Cannot be modified",
    isSystem: true,
    memberCount: 1,
    permissions: [
      { resource: "products", read: true, write: true, admin: true },
      { resource: "orders", read: true, write: true, admin: true },
      { resource: "inventory", read: true, write: true, admin: true },
      { resource: "members", read: true, write: true, admin: true },
      { resource: "settings", read: true, write: true, admin: true },
    ],
  },
  {
    id: "role-admin",
    name: "Admin",
    description: "Organization management access",
    isSystem: true,
    memberCount: 2,
    permissions: [
      { resource: "products", read: true, write: true, admin: true },
      { resource: "orders", read: true, write: true, admin: true },
      { resource: "inventory", read: true, write: true, admin: true },
      { resource: "members", read: true, write: true, admin: false },
      { resource: "settings", read: true, write: true, admin: false },
    ],
  },
  {
    id: "role-editor",
    name: "Editor",
    description: "Content editing permissions",
    isSystem: false,
    memberCount: 5,
    permissions: [
      { resource: "products", read: true, write: true, admin: false },
      { resource: "orders", read: true, write: false, admin: false },
      { resource: "inventory", read: true, write: true, admin: false },
      { resource: "members", read: true, write: false, admin: false },
      { resource: "settings", read: false, write: false, admin: false },
    ],
  },
  {
    id: "role-viewer",
    name: "Viewer",
    description: "Read-only access",
    isSystem: false,
    memberCount: 3,
    permissions: [
      { resource: "products", read: true, write: false, admin: false },
      { resource: "orders", read: true, write: false, admin: false },
      { resource: "inventory", read: true, write: false, admin: false },
      { resource: "members", read: true, write: false, admin: false },
      { resource: "settings", read: false, write: false, admin: false },
    ],
  },
];

export const mockMembers: IMember[] = [
  {
    id: "member-1",
    user: mockCurrentUser,
    role: mockRoles[0], // Owner
    joinedAt: new Date("2024-01-15"),
  },
  {
    id: "member-2",
    user: {
      id: "user-2",
      email: "jane.smith@acme.com",
      name: "Jane Smith",
      firstName: "Jane",
      lastName: "Smith",
      image: null,
      admin: true,
      emailVerified: true,
      createdAt: new Date("2024-02-01"),
      updatedAt: new Date("2024-05-15"),
      locale: "en-US",
    },
    role: mockRoles[1], // Admin
    joinedAt: new Date("2024-02-01"),
  },
  {
    id: "member-3",
    user: {
      id: "user-3",
      email: "bob.wilson@acme.com",
      name: "Bob Wilson",
      firstName: "Bob",
      lastName: "Wilson",
      image: null,
      admin: false,
      emailVerified: true,
      createdAt: new Date("2024-03-10"),
      updatedAt: new Date("2024-06-01"),
      locale: "en-US",
    },
    role: mockRoles[2], // Editor
    joinedAt: new Date("2024-03-10"),
  },
  {
    id: "member-4",
    user: {
      id: "user-4",
      email: "alice.johnson@acme.com",
      name: "Alice Johnson",
      firstName: "Alice",
      lastName: "Johnson",
      image: null,
      admin: false,
      emailVerified: true,
      createdAt: new Date("2024-04-20"),
      updatedAt: new Date("2024-05-30"),
      locale: "en-US",
    },
    role: mockRoles[3], // Viewer
    joinedAt: new Date("2024-04-20"),
  },
];

// Pending invitations mock data
export interface IInvitation {
  id: string;
  email: string;
  role: IRole;
  invitedAt: Date;
  expiresAt: Date;
}

export const mockInvitations: IInvitation[] = [
  {
    id: "inv-1",
    email: "alice@example.com",
    role: mockRoles[2], // Editor
    invitedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
  },
];

// Sessions mock data
export interface ISession {
  id: string;
  device: string;
  browser: string;
  os: string;
  location: string;
  lastActive: Date;
  isCurrent: boolean;
}

export const mockSessions: ISession[] = [
  {
    id: "session-1",
    device: "desktop",
    browser: "Chrome",
    os: "macOS",
    location: "San Francisco, US",
    lastActive: new Date(),
    isCurrent: true,
  },
  {
    id: "session-2",
    device: "mobile",
    browser: "Safari",
    os: "iPhone",
    location: "New York, US",
    lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    isCurrent: false,
  },
];

// Locale options
export const localeOptions = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "ru-RU", label: "Russian" },
  { value: "de-DE", label: "German" },
  { value: "fr-FR", label: "French" },
  { value: "es-ES", label: "Spanish" },
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
