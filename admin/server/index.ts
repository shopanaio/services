import express from 'express';
import cors from 'cors';
import { currentUser, mockUsers, mockProjects } from './mocks';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// GraphQL endpoint
app.post('/api/admin/graphql/query', (req, res) => {
  const { query, variables } = req.body;

  // Parse operation name from query
  const operationMatch = query?.match(/(?:query|mutation)\s+(\w+)/);
  const operationName = operationMatch?.[1] || '';

  console.log(`[GraphQL] ${operationName}`, variables || '');

  // Handle Me query - always return logged in user
  if (query?.includes('userQuery') && query?.includes('me')) {
    return res.json({
      data: {
        userQuery: {
          me: currentUser,
        },
      },
    });
  }

  // Handle SignIn mutation - always succeed
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

  // Handle GoogleSignIn mutation
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

  // Handle Projects query
  if (query?.includes('projectQuery') && query?.includes('projects')) {
    return res.json({
      data: {
        projectQuery: {
          projects: mockProjects.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            color: p.color,
            status: p.status,
          })),
        },
      },
    });
  }

  // Handle single Project query
  if (query?.includes('projectQuery') && query?.includes('project')) {
    const slug = variables?.slug || variables?.id;
    const project = mockProjects.find((p) => p.slug === slug || p.id === slug);

    if (project) {
      return res.json({
        data: {
          projectQuery: {
            project: {
              id: project.id,
              name: project.name,
              slug: project.slug,
              color: project.color,
              status: project.status,
              info: {
                country: project.country,
                currency: project.currency,
                locale: project.locale,
                name: project.name,
                timezone: project.timezone,
                phoneNumber: project.phoneNumber,
                email: project.email,
              },
            },
          },
        },
      });
    }
  }

  // Handle Users query
  if (query?.includes('userQuery') && query?.includes('users')) {
    return res.json({
      data: {
        userQuery: {
          users: mockUsers,
        },
      },
    });
  }

  // Default empty response for unhandled queries
  console.log('[GraphQL] Unhandled query:', query?.substring(0, 200));
  return res.json({
    data: null,
    errors: [{ message: 'Query not implemented in mock server' }],
  });
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Mock server running at http://127.0.0.1:${PORT}`);
  console.log(`GraphQL endpoint: http://127.0.0.1:${PORT}/api/admin/graphql/query`);
  console.log(`\nAuto-logged in as: ${currentUser.email}`);
});
