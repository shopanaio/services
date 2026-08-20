"use client";

import { Alert, Button, Flex, Skeleton, Spin } from "antd";
import { ModalLayout, useModalStackContext } from "@/layouts/modals";
import { Paper } from "@/ui-kit/paper";
import { CustomerDetailsCard } from "../../components/customer-details-card";
import { useCustomerModals } from "../../components/customer-details-card/hooks";
import { useCustomer } from "../../hooks";
import type { CustomerModalPayload } from "../../modals";

function CustomerDetailsSkeleton() {
  return (
    <Flex vertical gap={12} style={{ width: "100%" }}>
      <Paper>
        <Skeleton active avatar={{ size: 56 }} paragraph={{ rows: 4 }} />
        <Skeleton active paragraph={{ rows: 2 }} />
      </Paper>
      <Paper>
        <Skeleton active title paragraph={{ rows: 3 }} />
      </Paper>
      <Paper>
        <Skeleton active title paragraph={{ rows: 5 }} />
      </Paper>
    </Flex>
  );
}

function LoadedCustomer({
  query,
  payload,
}: {
  query: ReturnType<typeof useCustomer>;
  payload: CustomerModalPayload;
}) {
  const actions = useCustomerModals({
    customer: query.customer!,
    onRefetch: query.refetch,
    onSaved: payload.onSaved,
  });
  return (
    <>
      {query.loading ? (
        <Flex justify="center">
          <Spin size="small" aria-label="Refreshing customer details" />
        </Flex>
      ) : null}
      {query.error ? (
        <Alert
          type="warning"
          showIcon
          message="Customer details could not be refreshed."
          description={query.error.message}
          action={<Button onClick={() => void query.refetch()}>Retry</Button>}
        />
      ) : null}
      {actions.deleteConflict ? (
        <Alert
          type="warning"
          showIcon
          message="This customer changed after the delete confirmation was opened."
          action={
            <Button onClick={() => void actions.reloadAfterConflict()}>Reload latest data</Button>
          }
        />
      ) : null}
      {actions.deleteError ? <Alert type="error" showIcon message={actions.deleteError} /> : null}
      <CustomerDetailsCard
        customer={query.customer!}
        onEdit={actions.edit}
        onDelete={actions.confirmDelete}
        onTechnicalMetadata={actions.openMetadata}
      />
    </>
  );
}

export function CustomerModal() {
  const { payload, forcePop } = useModalStackContext();
  const typedPayload = payload as CustomerModalPayload;
  const query = useCustomer(typedPayload.entityId);
  return (
    <ModalLayout
      name="customer"
      headerProps={{ title: "Customer details", onClose: forcePop, submitButtonProps: null }}
    >
      {query.loading && !query.customer ? <CustomerDetailsSkeleton /> : null}
      {query.error && !query.customer ? (
        <Alert
          type="error"
          showIcon
          message="Unable to load customer details"
          description={query.error.message}
          action={<Button onClick={() => void query.refetch()}>Retry</Button>}
        />
      ) : null}
      {!query.loading && !query.error && !query.customer ? (
        <Alert
          type="warning"
          showIcon
          message="Customer not found"
          description="It may have been deleted or is no longer available in this store."
          action={<Button onClick={forcePop}>Close</Button>}
        />
      ) : null}
      {query.customer ? <LoadedCustomer query={query} payload={typedPayload} /> : null}
    </ModalLayout>
  );
}
