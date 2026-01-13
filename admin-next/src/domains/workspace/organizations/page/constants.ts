import type { IOrganization } from "./types";

export const mockOrganizations: IOrganization[] = [
  {
    id: "org-1",
    name: "acme-corp",
    displayName: "Acme Corporation",
    status: "active",
    color: "blue",
    storesCount: 5,
    membersCount: 12,
  },
  {
    id: "org-2",
    name: "tech-startup",
    displayName: "Tech Startup Inc",
    status: "active",
    color: "purple",
    storesCount: 2,
    membersCount: 8,
  },
  {
    id: "org-3",
    name: "retail-group",
    displayName: "Retail Group",
    status: "active",
    color: "green",
    storesCount: 10,
    membersCount: 25,
  },
  {
    id: "org-4",
    name: "old-company",
    displayName: "Old Company LLC",
    status: "inactive",
    color: "orange",
    storesCount: 0,
    membersCount: 3,
  },
];
