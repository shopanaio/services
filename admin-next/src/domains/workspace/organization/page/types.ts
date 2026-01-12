import type { ApiRole } from "@/graphql/types";

export interface IStore {
  id: string;
  name: string;
  slug: string;
  status: "active" | "inactive";
  color: string;
}

export interface IStoreItemProps {
  store: IStore;
  onClick?: () => void;
}

export interface IRoleCardProps {
  role: ApiRole;
  onEdit: () => void;
  onDelete: () => void;
}
