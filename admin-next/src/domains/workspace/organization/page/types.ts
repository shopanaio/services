import type { ApiRole, ApiMember, ApiStore } from "@/graphql/types";

export interface StoreItemProps {
  store: ApiStore;
  onClick?: () => void;
}

export interface RoleCardProps {
  role: ApiRole;
  onEdit?: () => void;
  onDelete?: () => void;
  selected?: boolean;
  onSelect?: () => void;
}

export interface StoresSectionProps {
  stores: ApiStore[];
  loading?: boolean;
  onStoreClick: (store: ApiStore) => void;
  onCreateStore: () => void;
}

export interface MembersSectionProps {
  members: ApiMember[];
  roles: ApiRole[];
  loading?: boolean;
  onInviteMember: () => void;
  onChangeRole: (memberId: string, roleId: string) => void;
  onRemoveMember: (memberId: string) => void;
}

export interface InvitationsSectionProps {
  onResend: (invitationId: string) => void;
  onCancel: (invitationId: string) => void;
}

export interface RolesSectionProps {
  roles: ApiRole[];
  loading?: boolean;
  onCreateRole: () => void;
  onEditRole: (role: ApiRole) => void;
  onDeleteRole: (roleId: string) => void;
}
