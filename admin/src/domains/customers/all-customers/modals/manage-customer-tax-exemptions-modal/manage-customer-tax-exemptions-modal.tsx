"use client";

import { useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Dropdown, Flex, Tag, Typography } from "antd";
import { LuEllipsis as MoreOutlined, LuPlus as PlusOutlined } from "react-icons/lu";
import type { ApiCustomerTaxExemptionsUpdateInput } from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useCustomerEditTaxExemptionModal } from "../../modals";
import {
  compactParts,
  customerTaxExemptionStatusColor,
  enumLabel,
  formatCustomerDate,
} from "../../components/customer-details-card/customer-details-utils";
import {
  cleanOptional,
  CustomerSectionModalFrame,
  customerTaxExemptionsManagerSchema,
  emptyExemptionDraft,
  exemptionToDraft,
  sameDraft,
  type CustomerTaxExemptionDraft,
  useCustomerFormStyles,
  useCustomerSectionModal,
} from "../shared";

type ManagerValues = { items: CustomerTaxExemptionDraft[]; deletedIds: string[] };
const input = (item: CustomerTaxExemptionDraft) => ({
  code: item.code.trim(),
  countryCode: cleanOptional(item.countryCode),
  regionCode: cleanOptional(item.regionCode),
  reason: cleanOptional(item.reason),
  status: item.status,
  certificateFileId: item.certificateFile?.id ?? null,
  validFrom: cleanOptional(item.validFrom),
  validTo: cleanOptional(item.validTo),
});

export function ManageCustomerTaxExemptionsModal() {
  const state = useCustomerSectionModal("Tax exemptions updated");
  const { push: openItem } = useCustomerEditTaxExemptionModal();
  const { styles } = useCustomerFormStyles();
  const initialized = useRef(false);
  const lastReload = useRef(-1);
  const original = useRef(new Map<string, CustomerTaxExemptionDraft>());
  const form = useForm<ManagerValues>({
    resolver: zodResolver(customerTaxExemptionsManagerSchema),
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
    const drafts = state.customer.taxExemptions.edges.map((edge) => exemptionToDraft(edge.node));
    original.current = new Map(drafts.map((item) => [item.id!, item]));
    reset({ items: drafts, deletedIds: [] });
    initialized.current = true;
    lastReload.current = state.reloadVersion;
  }, [reset, state.customer, state.reloadVersion]);
  useEffect(() => state.setDirty(isDirty), [isDirty, state.setDirty]);
  const applyItem = useCallback(
    (next: CustomerTaxExemptionDraft) => {
      const current = form.getValues("items");
      setValue(
        "items",
        current.some((item) => item.key === next.key)
          ? current.map((item) => (item.key === next.key ? next : item))
          : [...current, next],
        { shouldDirty: true, shouldValidate: true },
      );
    },
    [form, setValue],
  );
  const remove = (item: CustomerTaxExemptionDraft) => {
    setValue(
      "items",
      form.getValues("items").filter((candidate) => candidate.key !== item.key),
      { shouldDirty: true, shouldValidate: true },
    );
    if (item.id && !deletedIds.includes(item.id))
      setValue("deletedIds", [...deletedIds, item.id], { shouldDirty: true });
  };
  const submit = handleSubmit(async (values) => {
    const operations: ApiCustomerTaxExemptionsUpdateInput = {
      create: values.items.filter((item) => !item.id).map(input),
      update: values.items
        .filter((item): item is CustomerTaxExemptionDraft & { id: string } => Boolean(item.id))
        .filter((item) => !sameDraft(input(item), input(original.current.get(item.id)!)))
        .map((item) => ({ taxExemptionId: item.id, operations: input(item) })),
      deleteIds: values.deletedIds,
    };
    await state.save<ManagerValues>(
      { taxExemptions: operations },
      {
        "taxExemptions.create": "items",
        "taxExemptions.update": "items",
        "taxExemptions.deleteIds": "deletedIds",
      },
      setError,
    );
  });
  const truncated = state.customer
    ? state.customer.taxExemptions.totalCount > state.customer.taxExemptions.edges.length
    : false;
  return (
    <CustomerSectionModalFrame
      name="customer-manage-tax-exemptions"
      title="Manage tax exemptions"
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
          <PaperHeader title="Tax exemptions" />
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
                    {compactParts([
                      item.code,
                      compactParts([item.countryCode, item.regionCode], " / "),
                      item.validTo ? `through ${formatCustomerDate(item.validTo)}` : null,
                    ])}
                  </Typography.Text>
                  <Tag color={customerTaxExemptionStatusColor[item.status]}>
                    {enumLabel(item.status)}
                  </Tag>
                </Flex>
                {item.certificateFile ? (
                  <Typography.Text type="secondary">
                    {item.certificateFile.originalName}
                  </Typography.Text>
                ) : null}
              </Flex>
              <Dropdown
                menu={{
                  items: [
                    {
                      key: "edit",
                      label: "Edit exemption",
                      "data-testid": `customer-tax-exemption-${index}-edit-menu-item`,
                      onClick: () =>
                        openItem({ item, title: "Edit tax exemption", onApply: applyItem }),
                    },
                    {
                      key: "remove",
                      label: "Remove",
                      danger: true,
                      "data-testid": `customer-tax-exemption-${index}-remove-menu-item`,
                      onClick: () => remove(item),
                    },
                  ],
                }}
              >
                <Button
                  size="small"
                  icon={<MoreOutlined />}
                  aria-label={`Actions for ${item.code || `tax exemption ${index + 1}`}`}
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
                item: emptyExemptionDraft(),
                title: "Add tax exemption",
                onApply: applyItem,
              })
            }
          >
            Add exemption
          </Button>
          {truncated ? (
            <Typography.Text type="secondary" style={{ display: "block", marginTop: 12 }}>
              Showing {state.customer.taxExemptions.edges.length} of{" "}
              {state.customer.taxExemptions.totalCount}. Only explicit removals are submitted.
            </Typography.Text>
          ) : null}
        </Paper>
      ) : null}
    </CustomerSectionModalFrame>
  );
}
