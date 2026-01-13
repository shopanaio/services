import type { IOrganization } from "./types";

export const mockOrganizations: IOrganization[] = [
  {
    id: "org-1",
    name: "acme-corp",
    displayName: "Acme Corporation",
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "org-2",
    name: "tech-startup",
    displayName: "Tech Startup Inc",
    createdAt: "2024-02-15T00:00:00Z",
  },
  {
    id: "org-3",
    name: "retail-group",
    displayName: "Retail Group",
    createdAt: "2024-03-01T00:00:00Z",
  },
  {
    id: "org-4",
    name: "old-company",
    displayName: "Old Company LLC",
    createdAt: "2023-06-15T00:00:00Z",
  },
];
