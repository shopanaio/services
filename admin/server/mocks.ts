// Mock data for admin panel

export const mockUsers = [
  {
    id: '1',
    email: 'admin@shopana.io',
    firstName: 'Admin',
    lastName: 'User',
    isReady: true,
    isVerified: true,
    phoneNumber: '+1234567890',
    language: 'en',
    timezone: 'UTC',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    email: 'test@shopana.io',
    firstName: 'Test',
    lastName: 'User',
    isReady: true,
    isVerified: true,
    phoneNumber: null,
    language: 'en',
    timezone: 'UTC',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const mockProjects = [
  {
    id: 'proj-1',
    name: 'Demo Store',
    slug: 'demo-store',
    color: '#4F46E5',
    status: 'ACTIVE',
    country: 'US',
    currency: 'USD',
    locale: 'en-US',
    timezone: 'America/New_York',
    phoneNumber: '+1234567890',
    email: 'demo@shopana.io',
  },
  {
    id: 'proj-2',
    name: 'Test Shop',
    slug: 'test-shop',
    color: '#10B981',
    status: 'ACTIVE',
    country: 'GB',
    currency: 'GBP',
    locale: 'en-GB',
    timezone: 'Europe/London',
    phoneNumber: '+44123456789',
    email: 'test@shopana.io',
  },
];

// Current logged in user (always logged in without JWT)
export const currentUser = mockUsers[0];
