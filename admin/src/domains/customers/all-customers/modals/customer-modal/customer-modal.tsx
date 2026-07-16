"use client";

import { Alert, App, Flex, Skeleton } from "antd";
import { ModalLayout, useModalStackContext } from "@/layouts/modals";
import { CustomerDetailsCard } from "../../components/customer-details-card";
import { useCustomer, useDeleteCustomer } from "../../hooks";
import { useCustomerEditModal } from "../../modals";
import type { CustomerModalPayload } from "../../modals";
import { useCustomerDataRequestModal, useCustomerMergeModal } from "@/domains/customers/lifecycle/modals";

export function CustomerModal() {
  const { message } = App.useApp();
  const { payload, forcePop } = useModalStackContext();
  const typedPayload = payload as CustomerModalPayload;
  const query = useCustomer(typedPayload.entityId);
  const deletion = useDeleteCustomer();
  const { push: openEdit } = useCustomerEditModal();
  const { push: openMerge } = useCustomerMergeModal();
  const { push: openDataRequest } = useCustomerDataRequestModal();

  const renderContent = () => {
    if (query.loading && !query.customer) {
      return <Flex vertical gap={16} style={{ padding: 16 }}><Skeleton active paragraph={{ rows: 12 }} /></Flex>;
    }
    if (query.error && !query.customer) return <Alert type="error" showIcon message={query.error.message} />;
    if (!query.customer) return <Alert type="warning" showIcon message="Customer not found" />;

    return (
      <CustomerDetailsCard
        customer={query.customer}
        onEdit={(section) => openEdit({ entityId: query.customer!.id, section, onSaved: query.refetch })}
        onDelete={async () => {
          const result = await deletion.deleteCustomer({ id: query.customer!.id, expectedRevision: query.customer!.revision });
          if (result.deletedCustomerId) {
            await typedPayload.onSaved?.();
            forcePop();
            message.success("Customer deleted");
            return;
          }
          message.error(result.userErrors[0]?.message ?? "Unable to delete customer");
        }}
        onMerge={() => openMerge({ mode: "create", sourceCustomerId: query.customer!.id, onSaved: query.refetch })}
        onCreateDataRequest={() => openDataRequest({ mode: "create", customerId: query.customer!.id, onSaved: query.refetch })}
      />
    );
  };

  return (
    <ModalLayout name="customer" headerProps={{ title: "Customer", onClose: forcePop, submitButtonProps: null }}>
      {deletion.error ? <Alert type="error" showIcon message={deletion.error.message} /> : null}
      {renderContent()}
    </ModalLayout>
  );
}
