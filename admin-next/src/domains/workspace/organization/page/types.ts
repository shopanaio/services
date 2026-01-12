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

export interface IStoresSectionProps {
  stores: IStore[];
  onStoreClick: (store: IStore) => void;
  onCreateStore: () => void;
}

export interface IMembersSectionProps {
  onInviteMember: () => void;
}

export interface IInvitationsSectionProps {
  onResend: (invitationId: string) => void;
  onCancel: (invitationId: string) => void;
}

export interface IRolesSectionProps {
  onCreateRole: () => void;
  onEditRole: (role: ApiRole) => void;
  onDeleteRole: (roleId: string) => void;
}
