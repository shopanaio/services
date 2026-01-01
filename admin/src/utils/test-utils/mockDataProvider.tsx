import React, { createContext, useContext, ReactNode, useMemo, useState, useCallback } from 'react';
import { IProduct } from '@src/entity/Product/Product';
import { ICategory } from '@src/entity/Category/Category';
import { IUser } from '@src/entity/User/User';
import { IProject, IProjectInfo } from '@src/entity/Project/Project';
import {
  mockProducts,
  mockVariableProduct,
  createMockProduct,
} from './mockProducts';
import {
  mockCategories,
  createMockCategory,
} from './mockCategories';
import {
  mockUsers,
  mockCurrentUser,
  createMockUser,
} from './mockUsers';
import {
  mockProjects,
  mockProjectInfos,
  mockCurrentProject,
  mockCurrentProjectInfo,
  createMockProject,
} from './mockProjects';

interface PaginationMeta {
  page: number;
  pageSize: number;
  count: number;
  total: number;
  pageCount: number;
}

interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

interface MockDataContextValue {
  // Products
  products: IProduct[];
  getProducts: (page?: number, pageSize?: number) => PaginatedResult<IProduct>;
  getProduct: (id: string) => IProduct | null;
  createProduct: (data: Partial<IProduct>) => IProduct;
  updateProduct: (id: string, data: Partial<IProduct>) => IProduct | null;
  deleteProduct: (id: string) => boolean;

  // Categories
  categories: ICategory[];
  getCategories: (page?: number, pageSize?: number) => PaginatedResult<ICategory>;
  getCategory: (id: string) => ICategory | null;
  createCategory: (data: Partial<ICategory>) => ICategory;
  updateCategory: (id: string, data: Partial<ICategory>) => ICategory | null;
  deleteCategory: (id: string) => boolean;

  // Users
  users: IUser[];
  currentUser: IUser;
  getUsers: (page?: number, pageSize?: number) => PaginatedResult<IUser>;
  getUser: (id: string) => IUser | null;

  // Projects
  projects: IProject[];
  projectInfos: IProjectInfo[];
  currentProject: IProject;
  currentProjectInfo: IProjectInfo;
  getProjects: () => IProject[];
  getProject: (id: string) => IProject | null;
  getProjectInfo: (slug: string) => IProjectInfo | null;
  setCurrentProject: (id: string) => void;

  // Mock mode state
  isMockMode: boolean;
}

const MockDataContext = createContext<MockDataContextValue | null>(null);

export const useMockData = (): MockDataContextValue => {
  const context = useContext(MockDataContext);
  if (!context) {
    throw new Error('useMockData must be used within a MockDataProvider');
  }
  return context;
};

// Optional hook that returns null if not in mock mode
export const useMockDataOptional = (): MockDataContextValue | null => {
  return useContext(MockDataContext);
};

interface MockDataProviderProps {
  children: ReactNode;
  initialProducts?: IProduct[];
  initialCategories?: ICategory[];
  initialUsers?: IUser[];
  initialProjects?: IProject[];
}

export const MockDataProvider: React.FC<MockDataProviderProps> = ({
  children,
  initialProducts = [...mockProducts, mockVariableProduct],
  initialCategories = mockCategories,
  initialUsers = mockUsers,
  initialProjects = mockProjects,
}) => {
  // State for mutable data
  const [products, setProducts] = useState<IProduct[]>(initialProducts);
  const [categories, setCategories] = useState<ICategory[]>(initialCategories);
  const [users] = useState<IUser[]>(initialUsers);
  const [projects] = useState<IProject[]>(initialProjects);
  const [currentProjectId, setCurrentProjectId] = useState<string>(mockCurrentProject.id);

  // Products CRUD
  const getProducts = useCallback(
    (page = 1, pageSize = 25): PaginatedResult<IProduct> => {
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginatedData = products.slice(start, end);

      return {
        data: paginatedData,
        meta: {
          page,
          pageSize,
          count: paginatedData.length,
          total: products.length,
          pageCount: Math.ceil(products.length / pageSize),
        },
      };
    },
    [products],
  );

  const getProduct = useCallback(
    (id: string): IProduct | null => {
      return products.find((p) => p.id === id) || null;
    },
    [products],
  );

  const handleCreateProduct = useCallback(
    (data: Partial<IProduct>): IProduct => {
      const newProduct = createMockProduct(data, products.length);
      setProducts((prev) => [...prev, newProduct]);
      return newProduct;
    },
    [products.length],
  );

  const handleUpdateProduct = useCallback(
    (id: string, data: Partial<IProduct>): IProduct | null => {
      let updatedProduct: IProduct | null = null;
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === id) {
            updatedProduct = { ...p, ...data, updatedAt: new Date() };
            return updatedProduct;
          }
          return p;
        }),
      );
      return updatedProduct;
    },
    [],
  );

  const handleDeleteProduct = useCallback((id: string): boolean => {
    let deleted = false;
    setProducts((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      deleted = filtered.length < prev.length;
      return filtered;
    });
    return deleted;
  }, []);

  // Categories CRUD
  const getCategories = useCallback(
    (page = 1, pageSize = 25): PaginatedResult<ICategory> => {
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginatedData = categories.slice(start, end);

      return {
        data: paginatedData,
        meta: {
          page,
          pageSize,
          count: paginatedData.length,
          total: categories.length,
          pageCount: Math.ceil(categories.length / pageSize),
        },
      };
    },
    [categories],
  );

  const getCategory = useCallback(
    (id: string): ICategory | null => {
      return categories.find((c) => c.id === id) || null;
    },
    [categories],
  );

  const handleCreateCategory = useCallback(
    (data: Partial<ICategory>): ICategory => {
      const newCategory = createMockCategory(data, categories.length);
      setCategories((prev) => [...prev, newCategory]);
      return newCategory;
    },
    [categories.length],
  );

  const handleUpdateCategory = useCallback(
    (id: string, data: Partial<ICategory>): ICategory | null => {
      let updatedCategory: ICategory | null = null;
      setCategories((prev) =>
        prev.map((c) => {
          if (c.id === id) {
            updatedCategory = { ...c, ...data, updatedAt: new Date() };
            return updatedCategory;
          }
          return c;
        }),
      );
      return updatedCategory;
    },
    [],
  );

  const handleDeleteCategory = useCallback((id: string): boolean => {
    let deleted = false;
    setCategories((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      deleted = filtered.length < prev.length;
      return filtered;
    });
    return deleted;
  }, []);

  // Users
  const getUsers = useCallback(
    (page = 1, pageSize = 25): PaginatedResult<IUser> => {
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginatedData = users.slice(start, end);

      return {
        data: paginatedData,
        meta: {
          page,
          pageSize,
          count: paginatedData.length,
          total: users.length,
          pageCount: Math.ceil(users.length / pageSize),
        },
      };
    },
    [users],
  );

  const getUser = useCallback(
    (id: string): IUser | null => {
      return users.find((u) => u.id === id) || null;
    },
    [users],
  );

  // Projects
  const getProjects = useCallback((): IProject[] => {
    return projects;
  }, [projects]);

  const getProject = useCallback(
    (id: string): IProject | null => {
      return projects.find((p) => p.id === id) || null;
    },
    [projects],
  );

  const getProjectInfo = useCallback(
    (slug: string): IProjectInfo | null => {
      return mockProjectInfos.find((p) => p.slug === slug) || null;
    },
    [],
  );

  const setCurrentProject = useCallback((id: string) => {
    setCurrentProjectId(id);
  }, []);

  const currentProject = useMemo(() => {
    return projects.find((p) => p.id === currentProjectId) || mockCurrentProject;
  }, [projects, currentProjectId]);

  const currentProjectInfo = useMemo(() => {
    return mockProjectInfos.find((p) => p.slug === currentProject.slug) || mockCurrentProjectInfo;
  }, [currentProject]);

  const value = useMemo<MockDataContextValue>(
    () => ({
      // Products
      products,
      getProducts,
      getProduct,
      createProduct: handleCreateProduct,
      updateProduct: handleUpdateProduct,
      deleteProduct: handleDeleteProduct,

      // Categories
      categories,
      getCategories,
      getCategory,
      createCategory: handleCreateCategory,
      updateCategory: handleUpdateCategory,
      deleteCategory: handleDeleteCategory,

      // Users
      users,
      currentUser: mockCurrentUser,
      getUsers,
      getUser,

      // Projects
      projects,
      projectInfos: mockProjectInfos,
      currentProject,
      currentProjectInfo,
      getProjects,
      getProject,
      getProjectInfo,
      setCurrentProject,

      // Mock mode flag
      isMockMode: true,
    }),
    [
      products,
      getProducts,
      getProduct,
      handleCreateProduct,
      handleUpdateProduct,
      handleDeleteProduct,
      categories,
      getCategories,
      getCategory,
      handleCreateCategory,
      handleUpdateCategory,
      handleDeleteCategory,
      users,
      getUsers,
      getUser,
      projects,
      currentProject,
      currentProjectInfo,
      getProjects,
      getProject,
      getProjectInfo,
      setCurrentProject,
    ],
  );

  return (
    <MockDataContext.Provider value={value}>
      {children}
    </MockDataContext.Provider>
  );
};

export default MockDataProvider;
