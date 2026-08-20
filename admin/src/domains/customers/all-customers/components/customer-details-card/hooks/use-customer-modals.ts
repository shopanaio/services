"use client";

import { useState } from "react";
import { App } from "antd";
import type { ApiCustomer } from "@/graphql/types";
import { useModalStackContext } from "@/layouts/modals";
import { useDeleteCustomer } from "../../../hooks";
import {
  useCustomerEditCompanyModal,
  useCustomerEditConsentsModal,
  useCustomerEditContactModal,
  useCustomerEditGroupsModal,
  useCustomerEditModerationModal,
  useCustomerEditNoteModal,
  useCustomerEditProfileModal,
  useCustomerEditSegmentsModal,
  useCustomerEditStatusModal,
  useCustomerEditTagsModal,
  useCustomerManageAddressesModal,
  useCustomerManageTaxExemptionsModal,
  useCustomerManageTaxIdentifiersModal,
  useCustomerTechnicalMetadataModal,
  type CustomerEditSection,
} from "../../../modals";

export function useCustomerModals({
  customer,
  onRefetch,
  onSaved,
}: {
  customer: ApiCustomer;
  onRefetch: () => Promise<unknown>;
  onSaved?: () => Promise<unknown> | unknown;
}) {
  const { message, modal } = App.useApp();
  const { forcePop } = useModalStackContext();
  const deletion = useDeleteCustomer();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteConflict, setDeleteConflict] = useState(false);
  const profile = useCustomerEditProfileModal();
  const contact = useCustomerEditContactModal();
  const company = useCustomerEditCompanyModal();
  const addresses = useCustomerManageAddressesModal();
  const consents = useCustomerEditConsentsModal();
  const groups = useCustomerEditGroupsModal();
  const tags = useCustomerEditTagsModal();
  const segments = useCustomerEditSegmentsModal();
  const status = useCustomerEditStatusModal();
  const note = useCustomerEditNoteModal();
  const moderation = useCustomerEditModerationModal();
  const taxIdentifiers = useCustomerManageTaxIdentifiersModal();
  const taxExemptions = useCustomerManageTaxExemptionsModal();
  const metadata = useCustomerTechnicalMetadataModal();
  const payload = { entityId: customer.id, onSaved: onRefetch };
  const edit = (section: CustomerEditSection) => {
    const pushers = {
      profile,
      contact,
      company,
      addresses,
      consents,
      groups,
      tags,
      segments,
      status,
      note,
      moderation,
      taxIdentifiers,
      taxExemptions,
    };
    pushers[section].push(payload);
  };
  const confirmDelete = () => {
    modal.confirm({
      title: "Delete customer?",
      content: `${customer.displayName || "This customer"} will be soft-deleted and removed from active customer views. This does not erase personal data.`,
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        setDeleteError(null);
        setDeleteConflict(false);
        const result = await deletion.deleteCustomer({
          id: customer.id,
          expectedRevision: customer.revision,
        });
        if (!result.deletedCustomerId) {
          if (result.userErrors.some((item) => item.code === "REVISION_CONFLICT"))
            setDeleteConflict(true);
          else
            setDeleteError(
              result.userErrors.map((item) => item.message).join(" ") ||
                "Unable to delete customer",
            );
          return;
        }
        await onSaved?.();
        message.success("Customer deleted");
        forcePop();
      },
    });
  };
  const reloadAfterConflict = async () => {
    await onRefetch();
    setDeleteConflict(false);
    setDeleteError(null);
  };
  return {
    edit,
    openMetadata: () => metadata.push(payload),
    confirmDelete,
    deleteError: deleteError ?? deletion.error?.message ?? null,
    deleteConflict,
    reloadAfterConflict,
  };
}
