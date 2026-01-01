import express from 'express';
import cors from 'cors';
import {
  currentUser,
  mockProjects,
  mockProjectInfo,
  mockLocales,
  mockCurrencies,
  mockApiKeys,
  mockCategories,
  mockProducts,
  mockVariants,
} from './mocks';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// GraphQL endpoint
app.post('/api/admin/graphql/query', (req, res) => {
  const { query, variables } = req.body;

  const operationMatch = query?.match(/(?:query|mutation)\s+(\w+)/);
  const operationName = operationMatch?.[1] || '';

  console.log(`[GraphQL] ${operationName}`);
  if (operationName === 'Me') {
    console.log('[Query Body]', query);
  }

  // === USER QUERIES ===

  // Me query
  if (query?.includes('userQuery') && query?.includes('me')) {
    return res.json({
      data: {
        userQuery: {
          __typename: 'UserQuery',
          me: currentUser,
        },
      },
    });
  }

  // === USER MUTATIONS ===

  // SignIn
  if (query?.includes('userMutation') && query?.includes('signIn')) {
    return res.json({
      data: {
        userMutation: {
          signIn: {
            jwt: 'mock-jwt-token-12345',
            user: currentUser,
          },
        },
      },
    });
  }

  // GoogleSignIn
  if (query?.includes('userMutation') && query?.includes('googleSignIn')) {
    return res.json({
      data: {
        userMutation: {
          googleSignIn: {
            jwt: 'mock-jwt-token-google-12345',
            user: currentUser,
          },
        },
      },
    });
  }

  // SignUp
  if (query?.includes('userMutation') && query?.includes('signUp')) {
    return res.json({
      data: {
        userMutation: {
          signUp: {
            jwt: 'mock-jwt-token-signup-12345',
            user: currentUser,
          },
        },
      },
    });
  }

  // CreateProfile
  if (query?.includes('userMutation') && query?.includes('createProfile')) {
    return res.json({
      data: {
        userMutation: {
          createProfile: true,
        },
      },
    });
  }

  // UpdateProfile
  if (query?.includes('userMutation') && query?.includes('updateProfile')) {
    return res.json({
      data: {
        userMutation: {
          updateProfile: true,
        },
      },
    });
  }

  // === PROJECT QUERIES ===

  // ProjectQuery.findMany
  if (query?.includes('projectQuery') && query?.includes('findMany')) {
    return res.json({
      data: {
        projectQuery: {
          findMany: mockProjects,
        },
      },
    });
  }

  // ProjectQuery.findOne
  if (query?.includes('projectQuery') && query?.includes('findOne')) {
    const slug = variables?.slug;
    const project = mockProjects.find((p) => p.slug === slug);
    return res.json({
      data: {
        projectQuery: {
          findOne: project || null,
        },
      },
    });
  }

  // ProjectQuery.current
  if (query?.includes('projectQuery') && query?.includes('current')) {
    return res.json({
      data: {
        projectQuery: {
          current: mockProjectInfo,
        },
      },
    });
  }

  // ProjectQuery.locales
  if (query?.includes('projectQuery') && query?.includes('locales')) {
    return res.json({
      data: {
        projectQuery: {
          locales: mockLocales,
        },
      },
    });
  }

  // ProjectQuery.currencies
  if (query?.includes('projectQuery') && query?.includes('currencies')) {
    return res.json({
      data: {
        projectQuery: {
          currencies: mockCurrencies,
        },
      },
    });
  }

  // ProjectQuery.apiKeys
  if (query?.includes('projectQuery') && query?.includes('apiKeys')) {
    return res.json({
      data: {
        projectQuery: {
          apiKeys: mockApiKeys,
        },
      },
    });
  }

  // === PROJECT MUTATIONS ===

  // Create project
  if (query?.includes('projectMutation') && query?.includes('create')) {
    const newProject = {
      id: `proj-${Date.now()}`,
      name: variables?.input?.name || 'New Project',
      slug: variables?.input?.slug || 'new-project',
      status: 'ACTIVE',
    };
    return res.json({
      data: {
        projectMutation: {
          create: newProject,
        },
      },
    });
  }

  // Update project
  if (query?.includes('projectMutation') && query?.includes('update')) {
    return res.json({
      data: {
        projectMutation: {
          update: true,
        },
      },
    });
  }

  // === CATEGORY QUERIES ===

  // CategoryQuery.findMany
  if (query?.includes('categoryQuery') && query?.includes('findMany')) {
    return res.json({
      data: {
        categoryQuery: {
          __typename: 'CategoryQuery',
          findMany: {
            __typename: 'CategoriesOutput',
            data: mockCategories,
            meta: {
              __typename: 'CollectionMeta',
              page: 1,
              pageSize: 20,
              total: mockCategories.length,
              totalPages: 1,
            },
          },
        },
      },
    });
  }

  // CategoryQuery.findOne
  if (query?.includes('categoryQuery') && query?.includes('findOne')) {
    const id = variables?.id;
    const category = mockCategories.find((c) => c.id === id);
    return res.json({
      data: {
        categoryQuery: {
          __typename: 'CategoryQuery',
          findOne: category || null,
        },
      },
    });
  }

  // === PRODUCT QUERIES ===

  // ProductQuery.findMany
  if (query?.includes('productQuery') && query?.includes('findMany')) {
    return res.json({
      data: {
        productQuery: {
          __typename: 'ProductQuery',
          findMany: {
            __typename: 'ProductsOutput',
            data: mockProducts,
            meta: {
              __typename: 'CollectionMeta',
              page: 1,
              pageSize: 20,
              total: mockProducts.length,
              totalPages: 1,
            },
          },
        },
      },
    });
  }

  // ProductQuery.findOne
  if (query?.includes('productQuery') && query?.includes('findOne')) {
    const id = variables?.id;
    const product = mockProducts.find((p) => p.id === id);
    return res.json({
      data: {
        productQuery: {
          __typename: 'ProductQuery',
          findOne: product || null,
        },
      },
    });
  }

  // ProductQuery.findManyVariants
  if (query?.includes('productQuery') && query?.includes('findManyVariants')) {
    return res.json({
      data: {
        productQuery: {
          __typename: 'ProductQuery',
          findManyVariants: {
            __typename: 'VariantsOutput',
            data: mockVariants,
            meta: {
              __typename: 'CollectionMeta',
              page: 1,
              pageSize: 20,
              total: mockVariants.length,
              totalPages: 1,
            },
          },
        },
      },
    });
  }

  // Default: return empty data for unhandled queries
  console.log('[GraphQL] Unhandled:', query?.substring(0, 300));
  return res.json({
    data: null,
    errors: [{ message: `Query not implemented: ${operationName}` }],
  });
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Mock server running at http://127.0.0.1:${PORT}`);
  console.log(`GraphQL: http://127.0.0.1:${PORT}/api/admin/graphql/query`);
  console.log(`\nLogged in as: ${currentUser.email}`);
});
