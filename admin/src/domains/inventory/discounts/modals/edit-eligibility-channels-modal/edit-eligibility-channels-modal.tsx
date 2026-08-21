"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, App, Avatar, Button, Checkbox, Flex, Input, Segmented, Typography } from "antd";
import { AllCommunityModule, ModuleRegistry, type ColDef } from "ag-grid-community";
import { AgGridReact, type CustomCellRendererProps } from "ag-grid-react";
import { LuInfo, LuListPlus, LuTrash2 } from "react-icons/lu";
import { DiscountBuyerContextType } from "@/graphql/types";
import { useAgGridTheme } from "@/hooks";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { useEntityPicker } from "@/shared/components/entity-picker-modal";
import type { IPickableEntity } from "@/shared/components/entity-picker-modal/types";
import "@/domains/customers/all-customers/picker/customer-picker-config";
import type { CustomerSegmentPickerEntity } from "@/domains/customers/segments/picker";
import "@/domains/customers/segments/picker/customer-segment-picker-config";
import { useCustomerSegments } from "@/domains/customers/segments/hooks";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useUpdateDiscount } from "../../hooks";
import {
  buildDiscountEligibilityChannelsUpdateInput,
  createDiscountEligibilityChannelsFormValues,
  validateDiscountEligibilityChannelsForm,
  type DiscountEligibilityChannelsFormValues,
} from "../../mappers";
import type { IDiscountEligibilityChannelsEditModalPayload } from "../../modals";
import { useEditEligibilityChannelsModalStyles } from "./edit-eligibility-channels-modal.styles";

ModuleRegistry.registerModules([AllCommunityModule]);

interface CustomerPickerEntity extends IPickableEntity {
  email?: string;
}

interface SelectedEntityRow {
  id: string;
  title: string;
  secondary: string;
  customersCount: number | null;
}

interface GridContext {
  remove: (id: string) => void;
}

function initials(title: string) {
  return title
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function EntityCell({ data }: CustomCellRendererProps<SelectedEntityRow>) {
  const { styles } = useEditEligibilityChannelsModalStyles();
  if (!data) return null;

  return (
    <div className={styles.entityCell}>
      <Avatar size={28}>{initials(data.title)}</Avatar>
      <Typography.Text ellipsis className={styles.entityTitle}>
        {data.title}
      </Typography.Text>
    </div>
  );
}

function RemoveCell(params: CustomCellRendererProps<SelectedEntityRow>) {
  const { styles } = useEditEligibilityChannelsModalStyles();
  if (!params.data) return null;
  const context = params.context as GridContext;

  return (
    <div className={styles.actionCell}>
      <Button
        type="text"
        size="small"
        danger
        aria-label={`Remove ${params.data.title}`}
        icon={<LuTrash2 />}
        onClick={() => context.remove(params.data!.id)}
      />
    </div>
  );
}

const serializeValues = (values: DiscountEligibilityChannelsFormValues) =>
  JSON.stringify({
    buyerContextType: values.buyerContextType,
    customers: values.customers.map(({ id }) => id),
    segments: values.segments.map(({ id }) => id),
    channels: values.channels.map(({ code, enabled, featured }) => ({
      code,
      enabled,
      featured: enabled && featured,
    })),
  });

export function EditEligibilityChannelsModal() {
  const { styles } = useEditEligibilityChannelsModalStyles();
  const { message } = App.useApp();
  const agGridTheme = useAgGridTheme();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const { discount, onSaved } = payload as IDiscountEligibilityChannelsEditModalPayload;
  const mutation = useUpdateDiscount();
  const [values, setValues] = useState(() => createDiscountEligibilityChannelsFormValues(discount));
  const [initialSnapshot] = useState(() =>
    serializeValues(createDiscountEligibilityChannelsFormValues(discount)),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const dirty = serializeValues(values) !== initialSnapshot;
  const isCustomers = values.buyerContextType === DiscountBuyerContextType.Customers;
  const isSegments = values.buyerContextType === DiscountBuyerContextType.Segments;
  const selectedSegmentIds = values.segments.map(({ id }) => id);
  const { segments: resolvedSegments } = useCustomerSegments({
    first: Math.max(selectedSegmentIds.length, 1),
    where: { id: { _in: selectedSegmentIds } },
  });
  const resolvedSegmentById = useMemo(
    () => new Map(resolvedSegments.map((segment) => [segment.id, segment])),
    [resolvedSegments],
  );

  useEffect(() => {
    setDirty(dirty);
  }, [dirty, setDirty]);

  const updateValues = useCallback((changes: Partial<DiscountEligibilityChannelsFormValues>) => {
    setValues((current) => ({ ...current, ...changes }));
    setFormError(null);
  }, []);

  const customerPicker = useEntityPicker<CustomerPickerEntity>({
    entityType: "customer",
    selectionMode: "multi",
    allowEmptySelection: true,
    initialSelection: values.customers.map(({ id }) => id),
    onConfirm: (entities, ids) => {
      const current = new Map(values.customers.map((item) => [item.id, item]));
      entities.forEach((entity) =>
        current.set(entity.id, {
          id: entity.id,
          title: entity.title,
          email: entity.email ?? "",
        }),
      );
      updateValues({
        customers: ids.map((id) => current.get(id) ?? { id, title: id, email: "" }),
      });
    },
  });

  const segmentPicker = useEntityPicker<CustomerSegmentPickerEntity>({
    entityType: "customer-segment",
    selectionMode: "multi",
    allowEmptySelection: true,
    initialSelection: values.segments.map(({ id }) => id),
    onConfirm: (entities, ids) => {
      const current = new Map(values.segments.map((item) => [item.id, item]));
      entities.forEach((entity) =>
        current.set(entity.id, {
          id: entity.id,
          title: entity.title,
          customersCount: entity.customersCount,
        }),
      );
      updateValues({
        segments: ids.map(
          (id) =>
            current.get(id) ?? {
              id,
              title: id,
              customersCount: null,
            },
        ),
      });
    },
  });

  const rows = useMemo<SelectedEntityRow[]>(
    () =>
      isCustomers
        ? values.customers.map((customer) => ({
            id: customer.id,
            title: customer.title,
            secondary: customer.email,
            customersCount: null,
          }))
        : values.segments.map((segment) => ({
            id: segment.id,
            title: resolvedSegmentById.get(segment.id)?.name ?? segment.title,
            secondary: "",
            customersCount:
              resolvedSegmentById.get(segment.id)?.customersCount ?? segment.customersCount,
          })),
    [isCustomers, resolvedSegmentById, values.customers, values.segments],
  );

  const remove = useCallback(
    (id: string) => {
      if (isCustomers) {
        updateValues({
          customers: values.customers.filter((item) => item.id !== id),
        });
      } else {
        updateValues({
          segments: values.segments.filter((item) => item.id !== id),
        });
      }
    },
    [isCustomers, updateValues, values.customers, values.segments],
  );
  const gridContext = useMemo<GridContext>(() => ({ remove }), [remove]);
  const columnDefs = useMemo<ColDef<SelectedEntityRow>[]>(
    () => [
      {
        headerName: isCustomers ? "Customer" : "Segment",
        field: "title",
        flex: 1,
        minWidth: 260,
        cellRenderer: EntityCell,
      },
      ...(isCustomers
        ? [
            {
              headerName: "Email",
              field: "secondary" as const,
              flex: 1,
              minWidth: 240,
            },
          ]
        : [
            {
              headerName: "Members",
              field: "customersCount" as const,
              flex: 1,
              minWidth: 160,
              valueFormatter: ({ value }: { value: number | null }) =>
                value == null ? "—" : String(value),
            },
          ]),
      {
        headerName: "",
        colId: "actions",
        width: 52,
        cellRenderer: RemoveCell,
      },
    ],
    [isCustomers],
  );

  const enabledChannels = values.channels.filter((channel) => channel.enabled);
  const featuredChannels = enabledChannels.filter((channel) => channel.featured);

  const save = useCallback(async () => {
    const validationErrors = validateDiscountEligibilityChannelsForm(values);
    if (validationErrors.length > 0) {
      setFormError(validationErrors.join(" "));
      return;
    }

    const result = await mutation.updateDiscount({
      discountId: discount.id,

      operations: buildDiscountEligibilityChannelsUpdateInput(values),
    });

    if (!result.discount || result.errors.length > 0) {
      setFormError(
        result.errors.map((error) => error.message).join(" ") ||
          "Unable to update eligibility and channels.",
      );
      return;
    }

    setDirty(false);
    message.success("Eligibility and channels updated");
    forcePop();
    if (onSaved) {
      void Promise.resolve(onSaved()).catch(() => {
        message.error("Discount saved, but the details could not be refreshed");
      });
    }
  }, [discount, forcePop, message, mutation, onSaved, setDirty, values]);

  const contextCopy = {
    [DiscountBuyerContextType.All]: {
      title: "All customers",
      description: "Every customer can redeem this discount.",
    },
    [DiscountBuyerContextType.Customers]: {
      title: "Specific customers",
      description: "Only the selected customer accounts can redeem this discount.",
    },
    [DiscountBuyerContextType.Segments]: {
      title: "Customer segments",
      description: "Customers in the selected segments can redeem this discount.",
    },
  }[values.buyerContextType];
  const errorMessage = formError ?? mutation.error?.message ?? null;

  return (
    <ModalLayout
      name="discount-eligibility-channels-edit"
      header={
        <ModalHeader
          name="discount-eligibility-channels-edit"
          title="Edit eligibility & channels"
          onClose={pop}
          submitButtonProps={{
            children: "Save",
            loading: mutation.loading,
            disabled: !dirty,
            onClick: save,
          }}
        />
      }
      bodyClassName={styles.body}
    >
      <div className={styles.container}>
        {errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}

        <Paper className={styles.section}>
          <PaperHeader title="Buyer context" />
          <Segmented
            block
            value={values.buyerContextType}
            data-testid="discount-buyer-context"
            options={[
              {
                value: DiscountBuyerContextType.All,
                label: "All customers",
              },
              {
                value: DiscountBuyerContextType.Customers,
                label: "Customers",
              },
              {
                value: DiscountBuyerContextType.Segments,
                label: "Segments",
              },
            ]}
            onChange={(buyerContextType) =>
              updateValues({
                buyerContextType: buyerContextType as DiscountBuyerContextType,
              })
            }
          />
          <Flex vertical className={styles.contextDescription}>
            <Typography.Text strong>{contextCopy.title}</Typography.Text>
            <Typography.Text type="secondary">{contextCopy.description}</Typography.Text>
          </Flex>
        </Paper>

        {isCustomers || isSegments ? (
          <Paper className={styles.selectedPaper}>
            <PaperHeader
              title={`Selected ${isCustomers ? "customers" : "segments"}`}
              className={styles.selectedHeader}
              actions={<Typography.Text type="secondary">{rows.length} selected</Typography.Text>}
            />
            <div className={styles.selectedFields}>
              <Typography.Text strong className={styles.fieldLabel}>
                {isCustomers ? "Customers" : "Segments"}
              </Typography.Text>
              <Flex gap={8} className={styles.pickerRow}>
                <Input
                  readOnly
                  className={styles.pickerSummary}
                  value={
                    rows.length > 0
                      ? `${rows.length} ${isCustomers ? "customers" : "segments"} selected`
                      : ""
                  }
                  placeholder={`No ${isCustomers ? "customers" : "segments"} selected`}
                />
                <Button
                  icon={<LuListPlus />}
                  data-testid={`discount-${isCustomers ? "customers" : "segments"}-select-button`}
                  onClick={isCustomers ? customerPicker.openPicker : segmentPicker.openPicker}
                >
                  Select
                </Button>
              </Flex>
              <Typography.Text className={styles.fieldHelp}>
                Select {isCustomers ? "customers" : "segments"}, then review or remove them in the
                grid below.
              </Typography.Text>
            </div>
            <div className={styles.gridFrame}>
              <AgGridReact<SelectedEntityRow>
                theme={agGridTheme}
                rowData={rows}
                columnDefs={columnDefs}
                context={gridContext}
                defaultColDef={{
                  sortable: false,
                  resizable: false,
                  suppressHeaderMenuButton: true,
                }}
                getRowId={({ data }) => data.id}
                domLayout="autoHeight"
                headerHeight={40}
                rowHeight={56}
                suppressCellFocus
                suppressMovableColumns
                overlayNoRowsTemplate={`No ${isCustomers ? "customers" : "segments"} selected`}
              />
            </div>
            <Typography.Text className={styles.selectedFooter}>
              {isCustomers
                ? "Customers are stored by account ID."
                : "Segments are evaluated from current membership at redemption time."}
            </Typography.Text>
          </Paper>
        ) : null}

        <Paper className={styles.section}>
          <PaperHeader
            title="Channel access"
            actions={
              <Typography.Text type="secondary">
                {enabledChannels.length} channel
                {enabledChannels.length === 1 ? "" : "s"} · {featuredChannels.length} featured
              </Typography.Text>
            }
          />
          <div>
            {values.channels.map((channel) => (
              <div
                className={styles.channelRow}
                key={channel.code}
                data-testid={`discount-channel-row-${channel.code}`}
              >
                <Checkbox
                  checked={channel.enabled}
                  data-testid={`discount-channel-enabled-${channel.code.toLowerCase()}`}
                  onChange={(event) =>
                    updateValues({
                      channels: values.channels.map((item) =>
                        item.code === channel.code
                          ? {
                              ...item,
                              enabled: event.target.checked,
                              featured: event.target.checked ? item.featured : false,
                            }
                          : item,
                      ),
                    })
                  }
                >
                  <Flex vertical className={styles.channelCopy}>
                    <Typography.Text>{channel.title}</Typography.Text>
                    <Typography.Text className={styles.channelCode}>{channel.code}</Typography.Text>
                  </Flex>
                </Checkbox>
                <Checkbox
                  checked={channel.featured}
                  disabled={!channel.enabled}
                  data-testid={`discount-channel-featured-${channel.code.toLowerCase()}`}
                  onChange={(event) =>
                    updateValues({
                      channels: values.channels.map((item) =>
                        item.code === channel.code
                          ? { ...item, featured: event.target.checked }
                          : item,
                      ),
                    })
                  }
                >
                  Featured
                </Checkbox>
              </div>
            ))}
          </div>
        </Paper>

        <Flex align="center" gap={10} className={styles.info}>
          <LuInfo />
          <Typography.Text type="secondary">
            Featured is configured per enabled channel and only affects promotional placement.
          </Typography.Text>
        </Flex>
      </div>
    </ModalLayout>
  );
}
