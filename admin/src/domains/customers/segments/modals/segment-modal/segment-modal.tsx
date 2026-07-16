"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  App,
  Button,
  Flex,
  Input,
  Select,
  Skeleton,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  InfoCircleOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { createStyles } from "antd-style";
import { CustomerSegmentStatus, CustomerSegmentType } from "@/graphql/types";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useEntityPicker } from "@/shared/components/entity-picker-modal";
import type { IPickableEntity } from "@/shared/components/entity-picker-modal/types";
import "@/domains/customers/all-customers/picker/customer-picker-config";
import type { CustomerSegmentModalPayload } from "../../modals";
import {
  useCreateCustomerSegment,
  useCustomerSegment,
  useDeleteCustomerSegment,
  useSetCustomerSegmentMembers,
  useUpdateCustomerSegment,
} from "../../hooks";
import {
  buildCustomerSegmentCreateInput,
  buildCustomerSegmentUpdateInput,
  mapCustomerSegmentUserErrors,
} from "../../mappers";
import { segmentFormSchema, type SegmentFormValues } from "./schema";

const useStyles = createStyles(({ token }) => ({
  fields: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 220px",
    gap: token.padding,
    "@media (max-width: 640px)": { gridTemplateColumns: "1fr" },
  },
  fullWidth: { gridColumn: "1 / -1" },
  label: {
    display: "block",
    marginBottom: 6,
    color: token.colorText,
    fontWeight: 500,
  },
  error: { color: token.colorError, fontSize: 12, marginTop: 4 },
  help: { color: token.colorTextSecondary, fontSize: 13, marginTop: 4 },
  membershipCard: {
    padding: token.padding,
    borderRadius: token.borderRadiusLG,
    background: token.colorFillAlter,
  },
  memberCount: { margin: "0 !important" },
  manualNotice: {
    padding: token.paddingSM,
    borderRadius: token.borderRadius,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
}));

const DEFAULT_VALUES: SegmentFormValues = {
  name: "",
  description: "",
  color: "#1677ff",
};

const colorOptions = [
  { value: "#1677ff", label: "Blue" },
  { value: "#389e0d", label: "Green" },
  { value: "#d48806", label: "Orange" },
  { value: "#d4380d", label: "Red" },
  { value: "#722ed1", label: "Purple" },
  { value: "#08979c", label: "Cyan" },
  { value: "#c41d7f", label: "Magenta" },
  { value: "#595959", label: "Gray" },
];

export function CustomerSegmentModal() {
  const { styles } = useStyles();
  const { message, modal } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const typedPayload = payload as CustomerSegmentModalPayload;
  const isEdit = typedPayload.mode === "edit";
  const segmentQuery = useCustomerSegment(isEdit ? typedPayload.entityId : undefined);
  const { createSegment, loading: creating, error: createError } = useCreateCustomerSegment();
  const { updateSegment, loading: updating, error: updateError } = useUpdateCustomerSegment();
  const { deleteSegment, loading: deleting, error: deleteError } = useDeleteCustomerSegment();
  const { setSegmentMembers, loading: settingMembers, error: membersError } = useSetCustomerSegmentMembers();
  const [globalErrors, setGlobalErrors] = useState<string[]>([]);
  const [advancedDirty, setAdvancedDirty] = useState(false);
  const [segmentType, setSegmentType] = useState(CustomerSegmentType.Manual);
  const [segmentStatus, setSegmentStatus] = useState(CustomerSegmentStatus.Active);
  const [query, setQuery] = useState("");
  const [definition, setDefinition] = useState("{}");

  const methods = useForm<SegmentFormValues>({
    resolver: zodResolver(segmentFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onChange",
  });
  const {
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isDirty, isValid },
  } = methods;

  const combinedDirty = isDirty || advancedDirty;
  useEffect(() => setDirty(combinedDirty), [combinedDirty, setDirty]);

  useEffect(() => {
    if (!isEdit || !segmentQuery.segment) return;
    reset({
      name: segmentQuery.segment.name,
      description: segmentQuery.segment.description ?? "",
      color: segmentQuery.segment.color ?? "#1677ff",
    });
    setSegmentType(segmentQuery.segment.type);
    setSegmentStatus(segmentQuery.segment.status);
    setQuery(segmentQuery.segment.query ?? "");
    setDefinition(JSON.stringify(segmentQuery.segment.definition ?? {}, null, 2));
    setAdvancedDirty(false);
  }, [isEdit, reset, segmentQuery.segment]);

  const memberIds = useMemo(
    () => segmentQuery.segment?.customerMemberships.edges.map((edge) => edge.node.customer.id) ?? [],
    [segmentQuery.segment?.customerMemberships.edges],
  );

  const handleSetMembers = useCallback(async (
    _customers: IPickableEntity[],
    customerIds: string[],
  ) => {
    const current = segmentQuery.segment;
    if (!current) return;
    const result = await setSegmentMembers({
      segmentId: current.id,
      expectedRevision: current.revision,
      customerIds,
    });
    if (!result.segment || result.userErrors.length > 0) {
      message.error(result.userErrors[0]?.message ?? "Unable to update segment customers");
      return;
    }
    await segmentQuery.refetch();
    await typedPayload.onSaved?.();
    message.success("Segment customers updated");
  }, [message, segmentQuery, setSegmentMembers, typedPayload]);

  const { openPicker: openCustomerPicker } = useEntityPicker<IPickableEntity>({
    entityType: "customer",
    selectionMode: "multi",
    initialSelection: memberIds,
    allowEmptySelection: true,
    onConfirm: (customers, customerIds) => {
      void handleSetMembers(customers, customerIds);
    },
  });

  const onSubmit = useCallback(async (values: SegmentFormValues) => {
    setGlobalErrors([]);
    clearErrors();
    const current = segmentQuery.segment;
    let parsedDefinition: Record<string, unknown> | null = null;
    if (isEdit) {
      try {
        const parsed = JSON.parse(definition);
        if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error();
        parsedDefinition = parsed as Record<string, unknown>;
      } catch {
        setGlobalErrors(["Segment definition must be a valid JSON object."]);
        return;
      }
    }
    const result = isEdit && current
      ? await updateSegment(current.id, current.revision, {
          ...buildCustomerSegmentUpdateInput(values),
          definition: { type: segmentType, query: query.trim() || null, definition: parsedDefinition },
          state: { status: segmentStatus },
        })
      : await createSegment(buildCustomerSegmentCreateInput(values));

    if (!result.segment || result.userErrors.length > 0) {
      const global: string[] = [];
      mapCustomerSegmentUserErrors(result.userErrors).forEach((error) => {
        if (error.field) setError(error.field, { message: error.message });
        else global.push(error.message);
      });
      setGlobalErrors(global);
      return;
    }

    await typedPayload.onSaved?.();
    setDirty(false);
    message.success(isEdit ? "Segment updated" : "Segment created");
    forcePop();
  }, [clearErrors, createSegment, definition, forcePop, isEdit, message, query, segmentQuery.segment, segmentStatus, segmentType, setDirty, setError, typedPayload, updateSegment]);

  const handleDelete = useCallback(async () => {
    const current = segmentQuery.segment;
    if (!current) return;
    const confirmed = await modal.confirm({
      title: "Delete customer segment?",
      content: `${current.name} will be removed from ${current.customersCount} customer${current.customersCount === 1 ? "" : "s"}.`,
      okText: "Delete",
      okButtonProps: { danger: true },
    });
    if (!confirmed) return;

    const result = await deleteSegment({
      id: current.id,
      expectedRevision: current.revision,
    });
    if (!result.deletedSegmentId || result.userErrors.length > 0) {
      message.error(result.userErrors[0]?.message ?? "Unable to delete segment");
      return;
    }
    await typedPayload.onSaved?.();
    setDirty(false);
    message.success("Segment deleted");
    forcePop();
  }, [deleteSegment, forcePop, message, modal, segmentQuery.segment, setDirty, typedPayload]);

  const loading = isEdit && segmentQuery.loading;
  const saving = creating || updating;
  const transportError = segmentQuery.error ?? createError ?? updateError ?? deleteError ?? membersError;
  const title = isEdit ? "Edit segment" : "New segment";
  const segment = segmentQuery.segment;

  if (loading) {
    return (
      <ModalLayout
        name="customer-segment"
        header={<ModalHeader title={title} onClose={pop} submitButtonProps={{ disabled: true }} />}
      >
        <Skeleton active paragraph={{ rows: 9 }} />
      </ModalLayout>
    );
  }

  if (isEdit && !segment) {
    return (
      <ModalLayout name="customer-segment" headerProps={{ title, onClose: pop, submitButtonProps: null }}>
        <Alert type="error" showIcon message="Segment not found" />
      </ModalLayout>
    );
  }

  return (
    <FormProvider {...methods}>
      <ModalLayout
        name="customer-segment"
        header={
          <ModalHeader
            name="customer-segment"
            title={title}
            onClose={pop}
            extra={
              <Flex align="center" gap="small">
                <Tag color="blue">
                  {segment?.type === CustomerSegmentType.Dynamic ? "Dynamic" : "Manual"}
                </Tag>
                {isEdit ? (
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    loading={deleting}
                    onClick={handleDelete}
                  >
                    Delete
                  </Button>
                ) : null}
              </Flex>
            }
            submitButtonProps={{
              children: isEdit ? "Save" : "Create",
              loading: saving,
              disabled: saving || deleting || !isValid || (isEdit && !combinedDirty),
              onClick: handleSubmit(onSubmit),
            }}
          />
        }
      >
        {transportError ? <Alert type="error" showIcon message={transportError.message} /> : null}
        {globalErrors.length > 0 ? (
          <Alert
            type="error"
            showIcon
            message="Could not save segment"
            description={globalErrors.join(" ")}
          />
        ) : null}

        <Paper>
          <PaperHeader title="Segment details" icon={<EditOutlined />} />
          <div className={styles.fields}>
            <div>
              <label className={styles.label} htmlFor="customer-segment-name">Name *</label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="customer-segment-name" maxLength={100} status={errors.name ? "error" : undefined} />
                )}
              />
              {errors.name ? <div className={styles.error}>{errors.name.message}</div> : null}
            </div>
            <div>
              <label className={styles.label} htmlFor="customer-segment-color">Color *</label>
              <Controller
                name="color"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    id="customer-segment-color"
                    options={colorOptions.map((option) => ({
                      value: option.value,
                      label: (
                        <Flex align="center" gap={8}>
                          <span aria-hidden style={{ width: 10, height: 10, borderRadius: "50%", background: option.value }} />
                          {option.label}
                        </Flex>
                      ),
                    }))}
                    style={{ width: "100%" }}
                  />
                )}
              />
              {errors.color ? <div className={styles.error}>{errors.color.message}</div> : null}
            </div>
            <div className={styles.fullWidth}>
              <label className={styles.label} htmlFor="customer-segment-description">Description</label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <Input.TextArea
                    {...field}
                    id="customer-segment-description"
                    autoSize={{ minRows: 3, maxRows: 6 }}
                    maxLength={500}
                    showCount
                    status={errors.description ? "error" : undefined}
                  />
                )}
              />
              {errors.description ? <div className={styles.error}>{errors.description.message}</div> : null}
            </div>
          </div>
        </Paper>

        {isEdit ? (
          <Paper>
            <PaperHeader title="Definition & state" icon={<InfoCircleOutlined />} />
            <Flex vertical gap="middle">
              <div className={styles.fields}>
                <div>
                  <label className={styles.label}>Segment type</label>
                  <Select
                    value={segmentType}
                    options={Object.values(CustomerSegmentType).map((value) => ({ value, label: value.toLowerCase() }))}
                    onChange={(value) => { setSegmentType(value); setAdvancedDirty(true); }}
                    style={{ width: "100%" }}
                  />
                </div>
                <div>
                  <label className={styles.label}>Status</label>
                  <Select
                    value={segmentStatus}
                    options={Object.values(CustomerSegmentStatus).map((value) => ({ value, label: value.toLowerCase() }))}
                    onChange={(value) => { setSegmentStatus(value); setAdvancedDirty(true); }}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>
              {segmentType === CustomerSegmentType.Dynamic ? (
                <>
                  <div>
                    <label className={styles.label}>Query</label>
                    <Input.TextArea value={query} onChange={(event) => { setQuery(event.target.value); setAdvancedDirty(true); }} rows={4} />
                  </div>
                  <div>
                    <label className={styles.label}>Definition (JSON)</label>
                    <Input.TextArea value={definition} onChange={(event) => { setDefinition(event.target.value); setAdvancedDirty(true); }} rows={10} style={{ fontFamily: "monospace" }} />
                  </div>
                </>
              ) : null}
            </Flex>
          </Paper>
        ) : null}

        <Paper>
          <PaperHeader title="Customers" icon={<TeamOutlined />} />
          <Flex vertical gap="middle">
            <Flex align="center" justify="space-between" gap="middle" wrap className={styles.membershipCard}>
              <div>
                <Typography.Title level={3} className={styles.memberCount}>{segment?.customersCount ?? 0}</Typography.Title>
                <Typography.Text type="secondary">customers assigned manually</Typography.Text>
              </div>
              {isEdit && segment?.type === CustomerSegmentType.Manual ? (
                <Tooltip title={isDirty ? "Save segment details before changing customers" : undefined}>
                  <span>
                    <Button
                      icon={<TeamOutlined />}
                      disabled={isDirty || settingMembers}
                      loading={settingMembers}
                      onClick={openCustomerPicker}
                    >
                      Manage customers
                    </Button>
                  </span>
                </Tooltip>
              ) : isEdit ? (
                <Typography.Text type="secondary">Dynamic membership is managed by the segment definition.</Typography.Text>
              ) : (
                <Typography.Text type="secondary">Create the segment before assigning customers.</Typography.Text>
              )}
            </Flex>
            <Flex align="flex-start" gap="small" className={styles.manualNotice}>
              <InfoCircleOutlined style={{ marginTop: 3 }} />
              <Typography.Text type="secondary">
                {segment?.type === CustomerSegmentType.Dynamic
                  ? "Dynamic memberships are read from the materialized segment evaluation."
                  : "Manual memberships change only when an administrator updates the segment."}
              </Typography.Text>
            </Flex>
          </Flex>
        </Paper>
      </ModalLayout>
    </FormProvider>
  );
}
