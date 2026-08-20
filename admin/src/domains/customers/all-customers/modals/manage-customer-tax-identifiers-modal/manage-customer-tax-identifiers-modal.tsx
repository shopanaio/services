"use client";

import { useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Dropdown, Flex, Tag, Typography } from "antd";
import { LuEllipsis as MoreOutlined, LuPlus as PlusOutlined } from "react-icons/lu";
import type { ApiCustomerTaxIdentifiersUpdateInput } from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useCustomerEditTaxIdentifierModal } from "../../modals";
import {
  compactParts,
  customerTaxIdentifierStatusColor,
  enumLabel,
} from "../../components/customer-details-card/customer-details-utils";
import {
  cleanOptional,
  CustomerSectionModalFrame,
  customerTaxIdentifiersManagerSchema,
  emptyIdentifierDraft,
  identifierToDraft,
  sameDraft,
  type CustomerTaxIdentifierDraft,
  useCustomerFormStyles,
  useCustomerSectionModal,
} from "../shared";

type ManagerValues = { items: CustomerTaxIdentifierDraft[]; deletedIds: string[] };
const input = (item: CustomerTaxIdentifierDraft) => ({
  identifierType: item.identifierType.trim(),
  countryCode: cleanOptional(item.countryCode),
  value: item.value.trim(),
  status: item.status,
  isPrimary: item.isPrimary,
  validFrom: cleanOptional(item.validFrom),
  validTo: cleanOptional(item.validTo),
});

export function ManageCustomerTaxIdentifiersModal() {
  const state = useCustomerSectionModal("Tax identifiers updated");
  const { push: openItem } = useCustomerEditTaxIdentifierModal();
  const { styles } = useCustomerFormStyles();
  const initialized = useRef(false);
  const lastReload = useRef(-1);
  const original = useRef(new Map<string, CustomerTaxIdentifierDraft>());
  const form = useForm<ManagerValues>({
    resolver: zodResolver(customerTaxIdentifiersManagerSchema),
    defaultValues: { items: [], deletedIds: [] },
    mode: "onChange",
  });
  const {
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { isDirty, isValid },
  } = form;
  const items = watch("items");
  const deletedIds = watch("deletedIds");
  useEffect(() => {
    if (!state.customer || (initialized.current && lastReload.current === state.reloadVersion))
      return;
    const drafts = state.customer.taxIdentifiers.edges.map((edge) => identifierToDraft(edge.node));
    original.current = new Map(drafts.map((item) => [item.id!, item]));
    reset({ items: drafts, deletedIds: [] });
    initialized.current = true;
    lastReload.current = state.reloadVersion;
  }, [reset, state.customer, state.reloadVersion]);
  useEffect(() => state.setDirty(isDirty), [isDirty, state.setDirty]);
  const applyItem = useCallback(
    (next: CustomerTaxIdentifierDraft) => {
      let updated = form.getValues("items");
      updated = updated.some((item) => item.key === next.key)
        ? updated.map((item) => (item.key === next.key ? next : item))
        : [...updated, next];
      if (next.isPrimary)
        updated = updated.map((item) => ({ ...item, isPrimary: item.key === next.key }));
      setValue("items", updated, { shouldDirty: true, shouldValidate: true });
    },
    [form, setValue],
  );
  const remove = (item: CustomerTaxIdentifierDraft) => {
    setValue(
      "items",
      form.getValues("items").filter((candidate) => candidate.key !== item.key),
      { shouldDirty: true, shouldValidate: true },
    );
    if (item.id && !deletedIds.includes(item.id))
      setValue("deletedIds", [...deletedIds, item.id], { shouldDirty: true });
  };
  const submit = handleSubmit(async (values) => {
    const operations: ApiCustomerTaxIdentifiersUpdateInput = {
      create: values.items.filter((item) => !item.id).map(input),
      update: values.items
        .filter((item): item is CustomerTaxIdentifierDraft & { id: string } => Boolean(item.id))
        .filter((item) => !sameDraft(input(item), input(original.current.get(item.id)!)))
        .map((item) => ({ taxIdentifierId: item.id, operations: input(item) })),
      deleteIds: values.deletedIds,
    };
    await state.save<ManagerValues>(
      { taxIdentifiers: operations },
      {
        "taxIdentifiers.create": "items",
        "taxIdentifiers.update": "items",
        "taxIdentifiers.deleteIds": "deletedIds",
      },
      setError,
    );
  });
  const truncated = state.customer
    ? state.customer.taxIdentifiers.totalCount > state.customer.taxIdentifiers.edges.length
    : false;
  return (
    <CustomerSectionModalFrame
      name="customer-manage-tax-identifiers"
      title="Manage tax identifiers"
      loading={state.mutationLoading}
      disabled={!isDirty || !isValid || !state.customer || state.conflict}
      onSubmit={() => void submit()}
      onClose={state.pop}
      queryLoading={state.queryLoading}
      hasCustomer={Boolean(state.customer)}
      error={state.error}
      conflict={state.conflict}
      onReload={() => void state.reloadLatest(isDirty)}
    >
      {state.customer ? (
        <Paper>
          <PaperHeader title="Tax identifiers" />
          {items.map((item, index) => (
            <Flex
              key={item.key}
              align="center"
              justify="space-between"
              gap="middle"
              className={styles.collectionRow}
            >
              <Flex vertical gap={4} className={styles.rowSummary}>
                <Flex gap={6} wrap="wrap">
                  <Typography.Text strong>
                    {compactParts([item.identifierType, item.countryCode, item.value])}
                  </Typography.Text>
                  <Tag color={customerTaxIdentifierStatusColor[item.status]}>
                    {enumLabel(item.status)}
                  </Tag>
                  {item.isPrimary ? <Tag color="blue">Primary</Tag> : null}
                </Flex>
              </Flex>
              <Dropdown
                menu={{
                  items: [
                    {
                      key: "edit",
                      label: "Edit identifier",
                      "data-testid": `customer-tax-identifier-${index}-edit-menu-item`,
                      onClick: () =>
                        openItem({ item, title: "Edit tax identifier", onApply: applyItem }),
                    },
                    {
                      key: "remove",
                      label: "Remove",
                      danger: true,
                      "data-testid": `customer-tax-identifier-${index}-remove-menu-item`,
                      onClick: () => remove(item),
                    },
                  ],
                }}
              >
                <Button
                  size="small"
                  icon={<MoreOutlined />}
                  aria-label={`Actions for ${item.identifierType || `tax identifier ${index + 1}`}`}
                />
              </Dropdown>
            </Flex>
          ))}
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            style={{ marginTop: 12 }}
            onClick={() =>
              openItem({
                item: emptyIdentifierDraft(),
                title: "Add tax identifier",
                onApply: applyItem,
              })
            }
          >
            Add identifier
          </Button>
          {truncated ? (
            <Typography.Text type="secondary" style={{ display: "block", marginTop: 12 }}>
              Showing {state.customer.taxIdentifiers.edges.length} of{" "}
              {state.customer.taxIdentifiers.totalCount}. Only explicit removals are submitted.
            </Typography.Text>
          ) : null}
        </Paper>
      ) : null}
    </CustomerSectionModalFrame>
  );
}
