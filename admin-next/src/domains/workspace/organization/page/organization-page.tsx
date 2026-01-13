"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { message, Flex, Skeleton } from "antd";
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
import {
  useOrganization,
  useStores,
  useUpdateOrganization,
  useDeleteOrganization,
  useCreateStore,
  useInviteMember,
  useRemoveMember,
  useChangeMemberRole,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
} from "../../hooks";
import type { ApiRole, ApiStore } from "@/graphql/types";
import type { ModulePageProps } from "@/registry";
import {
  StoresSection,
  MembersSection,
  InvitationsSection,
  RolesSection,
} from "./components";

export default function OrganizationPage({ pathParams }: ModulePageProps) {
  const router = useRouter();
  const orgId = pathParams.orgName as string;
  const { push: pushDeleteModal } = useDeleteOrganizationModal();
  const { push: pushEditOrganizationModal } = useEditOrganizationModal();
  const { push: pushInviteModal } = useInviteMemberModal();
  const { push: pushEditRoleModal } = useEditRoleModal();
  const { push: pushCreateStoreModal } = useCreateStoreModal();

  const {
    organization,
    loading: orgLoading,
    refetch: refetchOrg,
  } = useOrganization(orgId);

  const {
    stores,
    loading: storesLoading,
    refetch: refetchStores,
  } = useStores({
    organizationId: orgId,
    skip: !orgId,
  });

  const { updateOrganization } = useUpdateOrganization();
  const { deleteOrganization } = useDeleteOrganization();
  const { createStore } = useCreateStore();
  const { inviteMember } = useInviteMember();
  const { removeMember } = useRemoveMember();
  const { changeMemberRole } = useChangeMemberRole();
  const { createRole } = useCreateRole();
  const { updateRole } = useUpdateRole();
  const { deleteRole } = useDeleteRole();

  const members = organization?.membership?.members ?? [];
  const roles = organization?.membership?.roles ?? [];

  const memberCount = members.length;
  const roleCount = roles.length;
  const storesCount = stores.length;

  const loading = orgLoading || storesLoading;

  const handleEditOrganization = useCallback(() => {
    if (!organization) return;
    pushEditOrganizationModal({
      displayName: organization.displayName,
      slug: organization.name,
      currentLogo: null,
      onSave: async (values: {
        displayName: string;
        slug: string;
        logo: string | null;
      }) => {
        const { userErrors } = await updateOrganization({
          id: organization.id,
          displayName: values.displayName,
          name: values.slug,
        });

        if (userErrors.length > 0) {
          userErrors.forEach((err) => message.error(err.message));
          return;
        }

        message.success("Organization updated successfully");
        refetchOrg();
      },
    });
  }, [organization, pushEditOrganizationModal, updateOrganization, refetchOrg]);

  const handleDeleteOrganization = useCallback(() => {
    if (!organization) return;
    pushDeleteModal({
      organizationName: organization.displayName,
      organizationSlug: organization.name,
      onDelete: async () => {
        const { userErrors } = await deleteOrganization(organization.id);

        if (userErrors.length > 0) {
          userErrors.forEach((err) => message.error(err.message));
          return;
        }

        message.success("Organization deleted");
        router.push("/workspace/organizations");
      },
    });
  }, [organization, pushDeleteModal, deleteOrganization, router]);

  const handleTransferOwnership = useCallback(() => {
    message.info("Transfer ownership modal would open");
  }, []);

  const handleStoreClick = useCallback(
    (store: ApiStore) => {
      router.push(`/${organization?.name}/${store.name}/products`);
    },
    [router, organization?.name]
  );

  const handleCreateStore = useCallback(() => {
    if (!organization) return;
    pushCreateStoreModal({
      onCreate: async (values: {
        name: string;
        country: string;
        currency: string;
        locales: string[];
      }) => {
        const { store, userErrors } = await createStore({
          organizationId: organization.id,
          name: values.name.toLowerCase().replace(/\s+/g, "-"),
          displayName: values.name,
          locales: values.locales as never[],
          currencies: [values.currency] as never[],
          defaultCurrency: values.currency as never,
        });

        if (userErrors.length > 0) {
          userErrors.forEach((err) => message.error(err.message));
          return;
        }

        if (store) {
          message.success(`Store "${values.name}" created successfully`);
          refetchStores();
        }
      },
    });
  }, [organization, pushCreateStoreModal, createStore, refetchStores]);

  const handleInviteMember = useCallback(() => {
    if (!organization) return;
    pushInviteModal({
      onInvite: async (email: string, roleId: string, _personalMessage?: string) => {
        const { userErrors } = await inviteMember(
          organization.id,
          email,
          [{ domain: "org", role: roleId }]
        );

        if (userErrors.length > 0) {
          userErrors.forEach((err) => message.error(err.message));
          return;
        }

        message.success(`Invitation sent to ${email}`);
        refetchOrg();
      },
    });
  }, [organization, pushInviteModal, inviteMember, refetchOrg]);

  const handleChangeRole = useCallback(
    async (memberId: string, roleName: string) => {
      if (!organization) return;
      const member = members.find((m) => m.id === memberId);
      if (!member?.user?.id) return;

      const { userErrors } = await changeMemberRole(
        organization.id,
        member.user.id,
        "org",
        roleName
      );

      if (userErrors.length > 0) {
        userErrors.forEach((err) => message.error(err.message));
        return;
      }

      message.success("Member role updated");
      refetchOrg();
    },
    [organization, members, changeMemberRole, refetchOrg]
  );

  const handleRemoveMember = useCallback(
    async (memberId: string) => {
      if (!organization) return;
      const member = members.find((m) => m.id === memberId);
      if (!member?.user?.id) return;

      const { userErrors } = await removeMember(
        organization.id,
        member.user.id
      );

      if (userErrors.length > 0) {
        userErrors.forEach((err) => message.error(err.message));
        return;
      }

      message.success("Member removed");
      refetchOrg();
    },
    [organization, members, removeMember, refetchOrg]
  );

  const handleResendInvitation = useCallback((_invitationId: string) => {
    message.success("Invitation resent");
  }, []);

  const handleCancelInvitation = useCallback((_invitationId: string) => {
    message.success("Invitation cancelled");
  }, []);

  const handleCreateRole = useCallback(async () => {
    if (!organization) return;
    const { role, userErrors } = await createRole({
      organizationId: organization.id,
      domain: "org",
      name: `custom-role-${Date.now()}`,
      displayName: "New Custom Role",
      permissions: [],
    });

    if (userErrors.length > 0) {
      userErrors.forEach((err) => message.error(err.message));
      return;
    }

    if (role) {
      message.success("Role created successfully");
      refetchOrg();
    }
  }, [organization, createRole, refetchOrg]);

  const handleEditRole = useCallback(
    (role: ApiRole) => {
      if (!organization) return;
      pushEditRoleModal({
        role,
        onSave: async (updatedRole: Partial<ApiRole>) => {
          const { userErrors } = await updateRole({
            id: role.id,
            organizationId: organization.id,
            displayName: updatedRole.displayName,
            description: updatedRole.description ?? undefined,
          });

          if (userErrors.length > 0) {
            userErrors.forEach((err) => message.error(err.message));
            return;
          }

          message.success(`Role ${role.displayName} updated`);
          refetchOrg();
        },
      });
    },
    [organization, pushEditRoleModal, updateRole, refetchOrg]
  );

  const handleDeleteRole = useCallback(
    async (roleId: string) => {
      if (!organization) return;
      const { userErrors } = await deleteRole(roleId, organization.id);

      if (userErrors.length > 0) {
        userErrors.forEach((err) => message.error(err.message));
        return;
      }

      message.success("Role deleted");
      refetchOrg();
    },
    [organization, deleteRole, refetchOrg]
  );

  if (loading && !organization) {
    return (
      <SettingsLayout name="organization">
        <Skeleton active paragraph={{ rows: 4 }} />
      </SettingsLayout>
    );
  }

  if (!organization) {
    return (
      <SettingsLayout name="organization">
        <div>Organization not found</div>
      </SettingsLayout>
    );
  }

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
        loading={storesLoading}
        onStoreClick={handleStoreClick}
        onCreateStore={handleCreateStore}
      />

      <MembersSection
        members={members}
        roles={roles}
        loading={orgLoading}
        onInviteMember={handleInviteMember}
        onChangeRole={handleChangeRole}
        onRemoveMember={handleRemoveMember}
      />

      <InvitationsSection
        onResend={handleResendInvitation}
        onCancel={handleCancelInvitation}
      />

      <RolesSection
        roles={roles}
        loading={orgLoading}
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
            buttonText: "Transfer",
            onClick: handleTransferOwnership,
          },
          {
            title: "Delete Organization",
            description:
              "Permanently delete this organization and all its data. This action cannot be undone.",
            buttonText: "Delete",
            onClick: handleDeleteOrganization,
          },
        ]}
      />
    </SettingsLayout>
  );
}
