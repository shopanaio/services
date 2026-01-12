"use client";

import { message, Flex } from "antd";
import { TeamOutlined, SafetyOutlined, ShopOutlined } from "@ant-design/icons";
import { KPITile } from "@/ui-kit/kpi-tile";
import { SettingsLayout } from "../../layout";
import { DangerZone } from "../../shared";
import { OrganizationInfoHeader } from "../components";
import {
  useDeleteOrganizationModal,
  useEditOrganizationModal,
  useInviteMemberModal,
  useEditRoleModal,
  useCreateStoreModal,
} from "../../modals";
import type { ApiRole } from "@/graphql/types";
import { mockOrganization, mockStores } from "./constants";
import type { IStore } from "./types";
import {
  StoresSection,
  MembersSection,
  InvitationsSection,
  RolesSection,
} from "./components";

export default function OrganizationPage() {
  const { push: pushDeleteModal } = useDeleteOrganizationModal();
  const { push: pushEditOrganizationModal } = useEditOrganizationModal();
  const { push: pushInviteModal } = useInviteMemberModal();
  const { push: pushEditRoleModal } = useEditRoleModal();
  const { push: pushCreateStoreModal } = useCreateStoreModal();

  const organization = mockOrganization;
  const stores = mockStores;

  const memberCount = organization.membership.members.length;
  const roleCount = organization.membership.roles.length;
  const storesCount = stores.length;

  const handleEditOrganization = () => {
    pushEditOrganizationModal({
      displayName: organization.displayName,
      slug: organization.name,
      currentLogo: null,
      onSave: (values: { displayName: string; slug: string; logo: string | null }) => {
        console.log("Saving organization:", values);
        message.success("Organization updated successfully");
      },
    });
  };

  const handleDeleteOrganization = () => {
    pushDeleteModal({
      organizationName: organization.displayName,
      organizationSlug: organization.name,
      onDelete: () => {
        message.success("Organization deleted");
      },
    });
  };

  const handleTransferOwnership = () => {
    message.info("Transfer ownership modal would open");
  };

  const handleStoreClick = (store: IStore) => {
    console.log("Navigate to store:", store.slug);
  };

  const handleCreateStore = () => {
    pushCreateStoreModal({
      onCreate: (values: { name: string }) => {
        console.log("Creating store:", values);
        message.success(`Store "${values.name}" created successfully`);
      },
    });
  };

  const handleInviteMember = () => {
    pushInviteModal({
      onInvite: (email: string, _roleId: string) => {
        message.success(`Invitation sent to ${email} (mock)`);
      },
    });
  };

  const handleResendInvitation = (_invitationId: string) => {
    message.success("Invitation resent");
  };

  const handleCancelInvitation = (_invitationId: string) => {
    message.success("Invitation cancelled");
  };

  const handleCreateRole = () => {
    message.info("Create role modal would open");
  };

  const handleEditRole = (role: ApiRole) => {
    pushEditRoleModal({
      role,
      onSave: (_updatedRole: Partial<ApiRole>) => {
        message.success(`Role ${role.displayName} updated (mock)`);
      },
    });
  };

  const handleDeleteRole = (_roleId: string) => {
    message.info("Delete role confirmation would open");
  };

  return (
    <SettingsLayout name="organization">
      <OrganizationInfoHeader
        organization={organization}
        onEdit={handleEditOrganization}
      />

      <Flex gap={16}>
        <KPITile
          label="Stores"
          value={storesCount}
          icon={<ShopOutlined />}
          tooltip="Total number of stores in organization"
        />
        <KPITile
          label="Members"
          value={memberCount}
          icon={<TeamOutlined />}
          tooltip="Total team members"
        />
        <KPITile
          label="Roles"
          value={roleCount}
          icon={<SafetyOutlined />}
          tooltip="Custom roles defined"
        />
      </Flex>

      <StoresSection
        stores={stores}
        onStoreClick={handleStoreClick}
        onCreateStore={handleCreateStore}
      />

      <MembersSection onInviteMember={handleInviteMember} />

      <InvitationsSection
        onResend={handleResendInvitation}
        onCancel={handleCancelInvitation}
      />

      <RolesSection
        onCreateRole={handleCreateRole}
        onEditRole={handleEditRole}
        onDeleteRole={handleDeleteRole}
      />

      <DangerZone
        items={[
          {
            title: "Transfer Ownership",
            description:
              "Transfer this organization to another admin member. You will retain admin access.",
            buttonText: "Transfer...",
            onClick: handleTransferOwnership,
          },
          {
            title: "Delete Organization",
            description:
              "Permanently delete this organization and all its data. This action cannot be undone.",
            buttonText: "Delete...",
            onClick: handleDeleteOrganization,
          },
        ]}
      />
    </SettingsLayout>
  );
}
