import { IUser } from '@src/entity/User/User';

const now = new Date().toISOString();
const lastMonth = new Date(Date.now() - 30 * 86400000).toISOString();

export const createMockUser = (
  overrides: Partial<IUser> = {},
  index: number = 0,
): IUser => ({
  id: `user-${index + 1}`,
  email: `user${index + 1}@example.com`,
  firstName: `FirstName${index + 1}`,
  lastName: `LastName${index + 1}`,
  phoneNumber: `+1555000${String(index + 1).padStart(4, '0')}`,
  isReady: true,
  isVerified: true,
  language: 'en',
  timezone: 'UTC',
  createdAt: lastMonth,
  updatedAt: now,
  ...overrides,
});

// Pre-defined mock users
export const mockUsers: IUser[] = [
  createMockUser({
    id: 'user-admin',
    email: 'admin@shopana.io',
    firstName: 'Admin',
    lastName: 'User',
    phoneNumber: '+15551234567',
    isReady: true,
    isVerified: true,
    language: 'en',
    timezone: 'America/New_York',
  }, 0),

  createMockUser({
    id: 'user-manager',
    email: 'manager@shopana.io',
    firstName: 'Store',
    lastName: 'Manager',
    phoneNumber: '+15552345678',
    isReady: true,
    isVerified: true,
    language: 'en',
    timezone: 'America/Los_Angeles',
  }, 1),

  createMockUser({
    id: 'user-editor',
    email: 'editor@shopana.io',
    firstName: 'Content',
    lastName: 'Editor',
    phoneNumber: '+15553456789',
    isReady: true,
    isVerified: true,
    language: 'en',
    timezone: 'Europe/London',
  }, 2),

  createMockUser({
    id: 'user-viewer',
    email: 'viewer@shopana.io',
    firstName: 'Read',
    lastName: 'Only',
    phoneNumber: null,
    isReady: true,
    isVerified: true,
    language: 'uk',
    timezone: 'Europe/Kiev',
  }, 3),

  createMockUser({
    id: 'user-pending',
    email: 'pending@shopana.io',
    firstName: 'Pending',
    lastName: 'Verification',
    phoneNumber: '+15554567890',
    isReady: false,
    isVerified: false,
    language: 'en',
    timezone: 'UTC',
  }, 4),
];

// Current logged-in user (for auth context)
export const mockCurrentUser: IUser = mockUsers[0];

// Helper to generate many users
export const generateMockUsers = (count: number): IUser[] => {
  return Array.from({ length: count }, (_, i) => createMockUser({}, i));
};

export const mockUsersWithMeta = {
  data: mockUsers,
  meta: {
    page: 1,
    pageSize: 25,
    count: mockUsers.length,
    total: mockUsers.length,
    pageCount: 1,
  },
};
