import type { ApiOrganization, ApiStore, StoreStatus } from "@/graphql/types";

export const mockOrganization: ApiOrganization = {
  id: "org-123",
  name: "acme-corp",
  displayName: "Acme Corporation",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-06-15T10:30:00Z",
  membership: {
    domain: "org",
    organizationId: "org-123",
    members: [
      {
        id: "member-1",
        user: {
          id: "user-1",
          email: "admin@example.com",
          firstName: "Jane",
          lastName: "Smith",
          avatar: null,
          isProfileComplete: true,
        },
        role: "admin",
        isOwner: false,
        grantedAt: "2024-02-15T00:00:00Z",
        grantedBy: null,
      },
      {
        id: "member-2",
        user: {
          id: "user-2",
          email: "editor@example.com",
          firstName: "Bob",
          lastName: "Wilson",
          avatar: null,
          isProfileComplete: true,
        },
        role: "editor",
        isOwner: false,
        grantedAt: "2024-03-01T00:00:00Z",
        grantedBy: null,
      },
    ],
    roles: [
      {
        id: "role-1",
        name: "admin",
        displayName: "Administrator",
        domain: "org",
        isSystem: true,
        permissions: [],
      },
      {
        id: "role-2",
        name: "editor",
        displayName: "Editor",
        domain: "org",
        isSystem: true,
        permissions: [],
      },
      {
        id: "role-3",
        name: "viewer",
        displayName: "Viewer",
        domain: "org",
        isSystem: true,
        permissions: [],
      },
    ],
  },
};

export const mockStores: Partial<ApiStore>[] = [
  { id: "store-1", name: "main-store", displayName: "Main Store", status: "ACTIVE" as StoreStatus },
  { id: "store-2", name: "fashion-outlet", displayName: "Fashion Outlet", status: "ACTIVE" as StoreStatus },
  { id: "store-3", name: "electronics-hub", displayName: "Electronics Hub", status: "ACTIVE" as StoreStatus },
  { id: "store-4", name: "home-decor", displayName: "Home Decor", status: "INACTIVE" as StoreStatus },
  { id: "store-5", name: "sports-gear", displayName: "Sports Gear", status: "ACTIVE" as StoreStatus },
];
