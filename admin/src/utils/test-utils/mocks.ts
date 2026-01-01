/**
 * Central export file for all mock data
 *
 * Usage:
 *
 * 1. Import individual mocks:
 *    import { mockProducts, mockCategories } from '@src/utils/test-utils/mocks';
 *
 * 2. Use MockDataProvider to enable mock mode:
 *    import { MockDataProvider } from '@src/utils/test-utils/mocks';
 *
 *    <MockDataProvider>
 *      <App />
 *    </MockDataProvider>
 *
 * 3. Access mock data in components:
 *    import { useMockData } from '@src/utils/test-utils/mocks';
 *
 *    const { products, getProduct, createProduct } = useMockData();
 */

// Locales and common utilities
export * from './locales';

// Products
export {
  mockProducts,
  mockVariableProduct,
  mockProductsWithMeta,
  createMockProduct,
  createMockVariant,
  generateMockProducts,
} from './mockProducts';

// Categories
export {
  mockCategories,
  mockCategoriesFlat,
  mockCategoriesWithMeta,
  createMockCategory,
  generateMockCategories,
} from './mockCategories';

// Users
export {
  mockUsers,
  mockCurrentUser,
  mockUsersWithMeta,
  createMockUser,
  generateMockUsers,
} from './mockUsers';

// Projects
export {
  mockProjects,
  mockProjectInfos,
  mockCurrentProject,
  mockCurrentProjectInfo,
  mockProjectsWithMeta,
  createMockProject,
  createMockProjectInfo,
  generateMockProjects,
} from './mockProjects';

// Provider
export {
  MockDataProvider,
  useMockData,
  useMockDataOptional,
} from './mockDataProvider';
