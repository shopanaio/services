import { IProject, IProjectInfo } from '@src/entity/Project/Project';
import { ProjectStatus } from '@src/graphql';

export const createMockProject = (
  overrides: Partial<IProject> = {},
  index: number = 0,
): IProject => ({
  id: `project-${index + 1}`,
  name: `Project ${index + 1}`,
  slug: `project-${index + 1}`,
  status: ProjectStatus.Active,
  color: ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316'][index % 5],
  ...overrides,
});

export const createMockProjectInfo = (
  overrides: Partial<IProjectInfo> = {},
  index: number = 0,
): IProjectInfo => ({
  slug: `project-${index + 1}`,
  name: `Project ${index + 1}`,
  country: 'US',
  currency: 'USD',
  locale: 'en',
  timezone: 'America/New_York',
  phoneNumber: '+15551234567',
  email: `contact@project${index + 1}.com`,
  color: ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316'][index % 5],
  ...overrides,
});

// Pre-defined mock projects
export const mockProjects: IProject[] = [
  createMockProject({
    id: 'proj-main',
    name: 'Main Store',
    slug: 'main-store',
    status: ProjectStatus.Active,
    color: '#6366f1',
  }, 0),

  createMockProject({
    id: 'proj-us',
    name: 'US Store',
    slug: 'us-store',
    status: ProjectStatus.Active,
    color: '#8b5cf6',
  }, 1),

  createMockProject({
    id: 'proj-eu',
    name: 'EU Store',
    slug: 'eu-store',
    status: ProjectStatus.Active,
    color: '#ec4899',
  }, 2),

  createMockProject({
    id: 'proj-test',
    name: 'Test Store',
    slug: 'test-store',
    status: ProjectStatus.Inactive,
    color: '#94a3b8',
  }, 3),
];

// Pre-defined mock project info
export const mockProjectInfos: IProjectInfo[] = [
  createMockProjectInfo({
    slug: 'main-store',
    name: 'Main Store',
    country: 'US',
    currency: 'USD',
    locale: 'en',
    timezone: 'America/New_York',
    phoneNumber: '+15551234567',
    email: 'contact@mainstore.com',
    color: '#6366f1',
  }, 0),

  createMockProjectInfo({
    slug: 'us-store',
    name: 'US Store',
    country: 'US',
    currency: 'USD',
    locale: 'en',
    timezone: 'America/Los_Angeles',
    phoneNumber: '+15559876543',
    email: 'contact@usstore.com',
    color: '#8b5cf6',
  }, 1),

  createMockProjectInfo({
    slug: 'eu-store',
    name: 'EU Store',
    country: 'DE',
    currency: 'EUR',
    locale: 'de',
    timezone: 'Europe/Berlin',
    phoneNumber: '+4930123456',
    email: 'contact@eustore.com',
    color: '#ec4899',
  }, 2),

  createMockProjectInfo({
    slug: 'test-store',
    name: 'Test Store',
    country: 'US',
    currency: 'USD',
    locale: 'en',
    timezone: 'UTC',
    phoneNumber: '+15550000000',
    email: 'test@teststore.com',
    color: '#94a3b8',
  }, 3),
];

// Current project (for store context)
export const mockCurrentProject: IProject = mockProjects[0];
export const mockCurrentProjectInfo: IProjectInfo = mockProjectInfos[0];

// Helper to generate many projects
export const generateMockProjects = (count: number): IProject[] => {
  return Array.from({ length: count }, (_, i) => createMockProject({}, i));
};

export const mockProjectsWithMeta = {
  data: mockProjects,
  meta: {
    page: 1,
    pageSize: 25,
    count: mockProjects.length,
    total: mockProjects.length,
    pageCount: 1,
  },
};
