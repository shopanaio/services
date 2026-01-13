import type { ApiRole, ApiMember } from "@/graphql/types";

export interface IStore {
  id: string;
  name: string;
  slug: string;
  status: "active" | "inactive";
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
  loading?: boolean;
  onStoreClick: (store: IStore) => void;
  onCreateStore: () => void;
}

export interface IMembersSectionProps {
  members: ApiMember[];
  roles: ApiRole[];
  loading?: boolean;
  onInviteMember: () => void;
  onChangeRole: (memberId: string, roleId: string) => void;
  onRemoveMember: (memberId: string) => void;
}

export interface IInvitationsSectionProps {
  onResend: (invitationId: string) => void;
  onCancel: (invitationId: string) => void;
}

export interface IRolesSectionProps {
  roles: ApiRole[];
  loading?: boolean;
  onCreateRole: () => void;
  onEditRole: (role: ApiRole) => void;
  onDeleteRole: (roleId: string) => void;
}
