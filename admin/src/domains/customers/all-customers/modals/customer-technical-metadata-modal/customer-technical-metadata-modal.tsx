"use client";

import { Alert, Button, Descriptions, Skeleton, Typography } from "antd";
import { ModalLayout, useModalStackContext } from "@/layouts/modals";
import { CopyableChip } from "@/ui-kit/copyable-chip";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useCustomer } from "../../hooks";
import type { CustomerSectionModalPayload } from "../../modals";
import {
  formatCustomerDateTime,
  formatCustomerSource,
} from "../../components/customer-details-card/customer-details-utils";

export function CustomerTechnicalMetadataModal() {
  const { payload, pop } = useModalStackContext();
  const value = payload as CustomerSectionModalPayload;
  const query = useCustomer(value.entityId);
  const customer = query.customer;
  const money = customer?.monetaryStatistics.edges[0]?.node;
  return (
    <ModalLayout
      name="customer-technical-metadata"
      headerProps={{ title: "Customer technical metadata", onClose: pop, submitButtonProps: null }}
    >
      {query.error ? (
        <Alert
          type="error"
          showIcon
          message={query.error.message}
          action={<Button onClick={() => void query.refetch()}>Retry</Button>}
        />
      ) : null}
      {query.loading && !customer ? <Skeleton active paragraph={{ rows: 8 }} /> : null}
      {customer ? (
        <>
          <Paper>
            <PaperHeader title="Identity" />
            <Descriptions
              column={1}
              items={[
                {
                  key: "id",
                  label: "Customer ID",
                  children: <CopyableChip value={customer.id} displayValue={customer.id} mono />,
                },
                {
                  key: "iam",
                  label: "IAM principal",
                  children: customer.iamPrincipalId ? (
                    <CopyableChip
                      value={customer.iamPrincipalId}
                      displayValue={customer.iamPrincipalId}
                      mono
                    />
                  ) : (
                    <Typography.Text type="secondary">No linked IAM principal</Typography.Text>
                  ),
                },
                { key: "source", label: "Source", children: formatCustomerSource(customer.source) },
                {
                  key: "created-by",
                  label: "Created by ID",
                  children: customer.createdByUserId ? (
                    <CopyableChip
                      value={customer.createdByUserId}
                      displayValue={customer.createdByUserId}
                      mono
                    />
                  ) : (
                    <Typography.Text type="secondary">No creator ID recorded</Typography.Text>
                  ),
                },
              ]}
            />
          </Paper>
          <Paper>
            <PaperHeader title="Audit" />
            <Descriptions
              column={1}
              items={[
                { key: "revision", label: "Revision", children: customer.revision },
                {
                  key: "created",
                  label: "Created",
                  children: formatCustomerDateTime(customer.createdAt),
                },
                {
                  key: "updated",
                  label: "Updated",
                  children: formatCustomerDateTime(customer.updatedAt),
                },
                {
                  key: "activity",
                  label: "Activity stats",
                  children: formatCustomerDateTime(customer.statistics?.updatedAt),
                },
                {
                  key: "money",
                  label: "Money stats",
                  children: formatCustomerDateTime(money?.updatedAt),
                },
              ]}
            />
          </Paper>
        </>
      ) : null}
      {!query.loading && !customer ? (
        <Alert
          type="error"
          showIcon
          message="Customer not found"
          description="It may have been deleted or is no longer available in this store."
        />
      ) : null}
    </ModalLayout>
  );
}
