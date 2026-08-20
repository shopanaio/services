"use client";

import { useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Dropdown, Flex, Select, Tag, Typography } from "antd";
import { LuEllipsis as MoreOutlined, LuPlus as PlusOutlined } from "react-icons/lu";
import type {
  ApiCustomerAddressCreateOperationInput,
  ApiCustomerAddressPatchInput,
  ApiCustomerAddressesUpdateInput,
} from "@/graphql/types";
import { CustomerAddressValidationStatus } from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useCustomerEditAddressModal } from "../../modals";
import {
  compactParts,
  enumLabel,
} from "../../components/customer-details-card/customer-details-utils";
import {
  cleanOptional,
  customerAddressDrafts,
  customerAddressManagerSchema,
  type CustomerAddressDraft,
  CustomerSectionModalFrame,
  emptyAddressDraft,
  sameDraft,
  useCustomerFormStyles,
  useCustomerSectionModal,
} from "../shared";

type AddressManagerValues = {
  items: CustomerAddressDraft[];
  deletedIds: string[];
  defaultShippingKey: string | null;
  defaultBillingKey: string | null;
};

const validationColor: Partial<Record<CustomerAddressValidationStatus, string>> = {
  [CustomerAddressValidationStatus.Valid]: "green",
  [CustomerAddressValidationStatus.Unvalidated]: "gold",
  [CustomerAddressValidationStatus.Invalid]: "red",
};

function addressPatch(item: CustomerAddressDraft): ApiCustomerAddressPatchInput {
  return {
    label: cleanOptional(item.label),
    prefix: cleanOptional(item.prefix),
    firstName: cleanOptional(item.firstName),
    middleName: cleanOptional(item.middleName),
    lastName: cleanOptional(item.lastName),
    suffix: cleanOptional(item.suffix),
    companyName: cleanOptional(item.companyName),
    phoneE164: cleanOptional(item.phoneE164),
    address1: item.address1.trim(),
    address2: cleanOptional(item.address2),
    city: item.city.trim(),
    regionName: cleanOptional(item.regionName),
    regionCode: cleanOptional(item.regionCode),
    postalCode: cleanOptional(item.postalCode),
    countryCode: item.countryCode,
  };
}

function addressCreate(
  item: CustomerAddressDraft,
  defaultShippingKey: string | null,
  defaultBillingKey: string | null,
): ApiCustomerAddressCreateOperationInput {
  return {
    ...addressPatch(item),
    address1: item.address1.trim(),
    city: item.city.trim(),
    countryCode: item.countryCode,
    isDefaultShipping: item.key === defaultShippingKey,
    isDefaultBilling: item.key === defaultBillingKey,
  };
}

export function ManageCustomerAddressesModal() {
  const state = useCustomerSectionModal("Addresses updated");
  const { push: openItem } = useCustomerEditAddressModal();
  const { styles } = useCustomerFormStyles();
  const initialized = useRef(false);
  const lastReload = useRef(-1);
  const original = useRef(new Map<string, CustomerAddressDraft>());
  const form = useForm<AddressManagerValues>({
    resolver: zodResolver(customerAddressManagerSchema),
    defaultValues: { items: [], deletedIds: [], defaultShippingKey: null, defaultBillingKey: null },
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
  const shippingKey = watch("defaultShippingKey");
  const billingKey = watch("defaultBillingKey");
  useEffect(() => {
    if (!state.customer || (initialized.current && lastReload.current === state.reloadVersion))
      return;
    const drafts = customerAddressDrafts(state.customer);
    original.current = new Map(
      drafts
        .filter((item): item is CustomerAddressDraft & { id: string } => Boolean(item.id))
        .map((item) => [item.id, item]),
    );
    reset({
      items: drafts,
      deletedIds: [],
      defaultShippingKey: state.customer.defaultShippingAddress?.id ?? null,
      defaultBillingKey: state.customer.defaultBillingAddress?.id ?? null,
    });
    initialized.current = true;
    lastReload.current = state.reloadVersion;
  }, [reset, state.customer, state.reloadVersion]);
  useEffect(() => state.setDirty(isDirty), [isDirty, state.setDirty]);

  const applyItem = useCallback(
    (next: CustomerAddressDraft) => {
      const current = form.getValues("items");
      const currentShippingKey = form.getValues("defaultShippingKey");
      const currentBillingKey = form.getValues("defaultBillingKey");
      let updated = current.some((item) => item.key === next.key)
        ? current.map((item) => (item.key === next.key ? next : item))
        : [...current, next];
      if (next.isDefaultShipping)
        updated = updated.map((item) => ({ ...item, isDefaultShipping: item.key === next.key }));
      if (next.isDefaultBilling)
        updated = updated.map((item) => ({ ...item, isDefaultBilling: item.key === next.key }));
      setValue("items", updated, { shouldDirty: true, shouldValidate: true });
      if (next.isDefaultShipping) setValue("defaultShippingKey", next.key, { shouldDirty: true });
      else if (currentShippingKey === next.key)
        setValue("defaultShippingKey", null, { shouldDirty: true });
      if (next.isDefaultBilling) setValue("defaultBillingKey", next.key, { shouldDirty: true });
      else if (currentBillingKey === next.key)
        setValue("defaultBillingKey", null, { shouldDirty: true });
    },
    [form, setValue],
  );

  const setDefault = (kind: "shipping" | "billing", key: string | null) => {
    const flag = kind === "shipping" ? "isDefaultShipping" : "isDefaultBilling";
    setValue(
      "items",
      form.getValues("items").map((item) => ({ ...item, [flag]: item.key === key })),
      { shouldDirty: true, shouldValidate: true },
    );
    setValue(kind === "shipping" ? "defaultShippingKey" : "defaultBillingKey", key, {
      shouldDirty: true,
    });
  };

  const remove = (item: CustomerAddressDraft) => {
    setValue(
      "items",
      form.getValues("items").filter((candidate) => candidate.key !== item.key),
      { shouldDirty: true, shouldValidate: true },
    );
    if (item.id && !deletedIds.includes(item.id))
      setValue("deletedIds", [...deletedIds, item.id], { shouldDirty: true });
    if (shippingKey === item.key) setDefault("shipping", null);
    if (billingKey === item.key) setDefault("billing", null);
  };

  const submit = handleSubmit(async (values) => {
    const operations: ApiCustomerAddressesUpdateInput = {
      create: values.items
        .filter((item) => !item.id)
        .map((item) => addressCreate(item, values.defaultShippingKey, values.defaultBillingKey)),
      update: values.items
        .filter((item): item is CustomerAddressDraft & { id: string } => Boolean(item.id))
        .filter(
          (item) => !sameDraft(addressPatch(item), addressPatch(original.current.get(item.id)!)),
        )
        .map((item) => ({ addressId: item.id, operations: addressPatch(item) })),
      deleteIds: values.deletedIds,
    };
    const shipping = values.items.find((item) => item.key === values.defaultShippingKey);
    const billing = values.items.find((item) => item.key === values.defaultBillingKey);
    if (!shipping || shipping.id) operations.defaultShippingAddressId = shipping?.id ?? null;
    if (!billing || billing.id) operations.defaultBillingAddressId = billing?.id ?? null;
    await state.save<AddressManagerValues>(
      { addresses: operations },
      {
        "addresses.create": "items",
        "addresses.update": "items",
        "addresses.deleteIds": "deletedIds",
        "addresses.defaultShippingAddressId": "defaultShippingKey",
        "addresses.defaultBillingAddressId": "defaultBillingKey",
      },
      setError,
    );
  });

  const options = items.map((item, index) => ({
    value: item.key,
    label: item.label || compactParts([item.address1, item.city]) || `Address ${index + 1}`,
  }));
  const truncated = state.customer
    ? state.customer.addresses.totalCount > state.customer.addresses.edges.length
    : false;
  return (
    <CustomerSectionModalFrame
      name="customer-manage-addresses"
      title="Manage addresses"
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
        <>
          <Paper>
            <PaperHeader
              title="Addresses"
              extra={
                <Typography.Text type="secondary">
                  {state.customer.addresses.totalCount} total
                </Typography.Text>
              }
            />
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
                    <Typography.Text strong>{item.label || `Address ${index + 1}`}</Typography.Text>
                    {item.key === shippingKey ? <Tag color="blue">Shipping</Tag> : null}
                    {item.key === billingKey ? <Tag color="purple">Billing</Tag> : null}
                    <Tag color={validationColor[item.validationStatus]}>
                      {enumLabel(item.validationStatus)}
                    </Tag>
                  </Flex>
                  <Typography.Text type="secondary">
                    {compactParts([item.address1, item.city, item.regionCode])}
                  </Typography.Text>
                </Flex>
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: "edit",
                        label: "Edit address",
                        "data-testid": `customer-address-${index}-edit-menu-item`,
                        onClick: () =>
                          openItem({ item, title: "Edit address", onApply: applyItem }),
                      },
                      {
                        key: "shipping",
                        label: "Set as shipping default",
                        "data-testid": `customer-address-${index}-shipping-menu-item`,
                        onClick: () => setDefault("shipping", item.key),
                      },
                      {
                        key: "billing",
                        label: "Set as billing default",
                        "data-testid": `customer-address-${index}-billing-menu-item`,
                        onClick: () => setDefault("billing", item.key),
                      },
                      { type: "divider" as const },
                      {
                        key: "remove",
                        label: "Remove",
                        danger: true,
                        "data-testid": `customer-address-${index}-remove-menu-item`,
                        onClick: () => remove(item),
                      },
                    ],
                  }}
                >
                  <Button
                    size="small"
                    icon={<MoreOutlined />}
                    aria-label={`Actions for ${item.label || `address ${index + 1}`}`}
                  />
                </Dropdown>
              </Flex>
            ))}
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              style={{ marginTop: 12 }}
              onClick={() =>
                openItem({ item: emptyAddressDraft(), title: "Add address", onApply: applyItem })
              }
            >
              Add address
            </Button>
            {truncated ? (
              <Typography.Text type="secondary" style={{ display: "block", marginTop: 12 }}>
                Showing {state.customer.addresses.edges.length} of{" "}
                {state.customer.addresses.totalCount}. Only explicit removals are submitted;
                defaults outside the first page remain available.
              </Typography.Text>
            ) : null}
          </Paper>
          <Paper>
            <PaperHeader title="Defaults" />
            <div className={styles.grid}>
              <div>
                <Typography.Text className={styles.label}>Shipping</Typography.Text>
                <Select
                  allowClear
                  value={shippingKey ?? undefined}
                  options={options}
                  onChange={(value) => setDefault("shipping", value ?? null)}
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <Typography.Text className={styles.label}>Billing</Typography.Text>
                <Select
                  allowClear
                  value={billingKey ?? undefined}
                  options={options}
                  onChange={(value) => setDefault("billing", value ?? null)}
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          </Paper>
        </>
      ) : null}
    </CustomerSectionModalFrame>
  );
}
