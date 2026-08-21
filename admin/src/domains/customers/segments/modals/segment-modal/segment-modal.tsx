"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLazyQuery, useQuery } from "@apollo/client/react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, App, Button, Flex, Input, Select, Skeleton, Tag, Tooltip, Typography } from "antd";
import {
  LuTrash2 as DeleteOutlined,
  LuPencil as EditOutlined,
  LuCircleHelp as InfoCircleOutlined,
  LuUsers as TeamOutlined,
} from "react-icons/lu";
import { createStyles } from "antd-style";
import { CustomerSegmentStatus, CustomerSegmentType } from "@/graphql/types";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
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
import {
  CUSTOMER_SEGMENT_ATTRIBUTE_CATALOG_QUERY,
  CUSTOMER_SEGMENT_PREVIEW_QUERY,
  CUSTOMER_SEGMENT_QUERY_VALIDATE,
} from "../../graphql";
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
  builderRow: {
    display: "grid",
    gridTemplateColumns: "minmax(180px, 1.4fr) minmax(140px, 1fr) minmax(180px, 1.4fr) auto",
    gap: token.paddingSM,
    alignItems: "start",
    "@media (max-width: 800px)": { gridTemplateColumns: "1fr" },
  },
  builderActions: {
    display: "flex",
    gap: token.paddingSM,
    flexWrap: "wrap",
  },
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

interface SegmentDiagnostic {
  code: string;
  message: string;
  severity: "ERROR" | "WARNING";
  line: number;
  column: number;
}

interface SegmentValidation {
  valid: boolean;
  canonicalQuery: string | null;
  complexity: number | null;
  diagnostics: SegmentDiagnostic[];
}

interface SegmentCatalogData {
  customersQuery: {
    customerSegmentAttributeCatalog: SegmentCatalogItem[];
  };
}

interface SegmentCatalogItem {
  name: string;
  kind: "SCALAR" | "LIST" | "FUNCTION" | "VIRTUAL";
  valueType: string;
  operators: string[];
  enumValues: string[];
  availability: "AVAILABLE" | "UNAVAILABLE";
  unavailabilityReason: string | null;
}

interface BuilderCondition {
  id: number;
  attribute: string;
  operator: string;
  value: string;
  upperValue: string;
}

let nextBuilderConditionId = 1;

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
  const {
    setSegmentMembers,
    loading: settingMembers,
    error: membersError,
  } = useSetCustomerSegmentMembers();
  const [globalErrors, setGlobalErrors] = useState<string[]>([]);
  const [advancedDirty, setAdvancedDirty] = useState(false);
  const [segmentType, setSegmentType] = useState(CustomerSegmentType.Manual);
  const [segmentStatus, setSegmentStatus] = useState(CustomerSegmentStatus.Active);
  const [query, setQuery] = useState("");
  const [builderJoin, setBuilderJoin] = useState<"AND" | "OR">("AND");
  const [builderConditions, setBuilderConditions] = useState<BuilderCondition[]>([]);
  const [validation, setValidation] = useState<SegmentValidation | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const catalogQuery = useQuery<SegmentCatalogData>(CUSTOMER_SEGMENT_ATTRIBUTE_CATALOG_QUERY);
  const [validateQuery, { loading: validating }] = useLazyQuery<{
    customersQuery: { customerSegmentQueryValidate: SegmentValidation };
  }>(CUSTOMER_SEGMENT_QUERY_VALIDATE, { fetchPolicy: "no-cache" });
  const [previewQuery, { loading: previewing }] = useLazyQuery<{
    customersQuery: {
      customerSegmentPreview: {
        timedOut: boolean;
        totalCount: number | null;
        validation: SegmentValidation;
      };
    };
  }>(CUSTOMER_SEGMENT_PREVIEW_QUERY, { fetchPolicy: "no-cache" });
  const catalog = catalogQuery.data?.customersQuery.customerSegmentAttributeCatalog ?? [];
  const visualAttributes = catalog.filter(
    (item) => item.kind !== "FUNCTION" && item.availability === "AVAILABLE",
  );

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
    const segment = segmentQuery.segment;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      reset({
        name: segment.name,
        description: segment.description ?? "",
        color: segment.color ?? "#1677ff",
      });
      setSegmentType(segment.type);
      setSegmentStatus(segment.status);
      setQuery(segment.query ?? "");
      setBuilderConditions([]);
      setValidation(null);
      setPreviewCount(null);
      setAdvancedDirty(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isEdit, reset, segmentQuery.segment]);

  const memberIds = useMemo(
    () =>
      segmentQuery.segment?.customerMemberships.edges.map((edge) => edge.node.customer.id) ?? [],
    [segmentQuery.segment?.customerMemberships.edges],
  );

  const handleSetMembers = useCallback(
    async (_customers: IPickableEntity[], customerIds: string[]) => {
      const current = segmentQuery.segment;
      if (!current) return;
      const result = await setSegmentMembers({
        segmentId: current.id,

        customerIds,
      });
      if (!result.segment || result.userErrors.length > 0) {
        message.error(result.userErrors[0]?.message ?? "Unable to update segment customers");
        return;
      }
      await segmentQuery.refetch();
      await typedPayload.onSaved?.();
      message.success("Segment customers updated");
    },
    [message, segmentQuery, setSegmentMembers, typedPayload],
  );

  const { openPicker: openCustomerPicker } = useEntityPicker<IPickableEntity>({
    entityType: "customer",
    selectionMode: "multi",
    initialSelection: memberIds,
    allowEmptySelection: true,
    onConfirm: (customers, customerIds) => {
      void handleSetMembers(customers, customerIds);
    },
  });

  const handleValidateQuery = useCallback(async (): Promise<SegmentValidation | null> => {
    if (segmentType !== CustomerSegmentType.Dynamic) return null;
    const result = await validateQuery({ variables: { query } });
    const next = result.data?.customersQuery.customerSegmentQueryValidate ?? null;
    setValidation(next);
    if (next?.canonicalQuery && next.valid) setQuery(next.canonicalQuery);
    return next;
  }, [query, segmentType, validateQuery]);

  const handlePreview = useCallback(async () => {
    const result = await previewQuery({ variables: { query, first: 50 } });
    const preview = result.data?.customersQuery.customerSegmentPreview;
    if (!preview) return;
    setValidation(preview.validation);
    setPreviewCount(preview.timedOut ? null : preview.totalCount);
  }, [previewQuery, query]);

  const addBuilderCondition = useCallback(() => {
    const attribute = visualAttributes[0];
    if (!attribute) return;
    setBuilderConditions((current) => [
      ...current,
      {
        id: nextBuilderConditionId++,
        attribute: attribute.name,
        operator: attribute.operators[0] ?? "eq",
        value: "",
        upperValue: "",
      },
    ]);
    setAdvancedDirty(true);
  }, [visualAttributes]);

  const updateBuilderCondition = useCallback(
    (id: number, patch: Partial<Omit<BuilderCondition, "id">>) => {
      setBuilderConditions((current) =>
        current.map((condition) => (condition.id === id ? { ...condition, ...patch } : condition)),
      );
      setAdvancedDirty(true);
    },
    [],
  );

  const applyVisualBuilder = useCallback(() => {
    const clauses = builderConditions
      .map((condition) => {
        const attribute = visualAttributes.find((item) => item.name === condition.attribute);
        return attribute ? printBuilderCondition(condition, attribute) : "";
      })
      .filter(Boolean);
    if (clauses.length === 0) return;
    setQuery(clauses.join(` ${builderJoin} `));
    setValidation(null);
    setPreviewCount(null);
    setAdvancedDirty(true);
  }, [builderConditions, builderJoin, visualAttributes]);

  const onSubmit = useCallback(
    async (values: SegmentFormValues) => {
      setGlobalErrors([]);
      clearErrors();
      const current = segmentQuery.segment;
      if (segmentType === CustomerSegmentType.Dynamic) {
        const result = await handleValidateQuery();
        if (!result?.valid) {
          setGlobalErrors(["Fix the segment query before saving."]);
          return;
        }
      }
      const result =
        isEdit && current
          ? await updateSegment(current.id, current.revision, {
              ...buildCustomerSegmentUpdateInput(values),
              ...(current.type === CustomerSegmentType.Dynamic
                ? { definition: { query: query.trim() } }
                : {}),
              state: { status: segmentStatus },
            })
          : await createSegment(
              buildCustomerSegmentCreateInput(values, segmentType, segmentStatus, query),
            );

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
    },
    [
      clearErrors,
      createSegment,
      forcePop,
      handleValidateQuery,
      isEdit,
      message,
      query,
      segmentQuery.segment,
      segmentStatus,
      segmentType,
      setDirty,
      setError,
      typedPayload,
      updateSegment,
    ],
  );

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
  const transportError =
    segmentQuery.error ?? createError ?? updateError ?? deleteError ?? membersError;
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
      <ModalLayout
        name="customer-segment"
        headerProps={{ title, onClose: pop, submitButtonProps: null }}
      >
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
                  {segmentType === CustomerSegmentType.Dynamic ? "Dynamic" : "Manual"}
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
              <label className={styles.label} htmlFor="customer-segment-name">
                Name *
              </label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="customer-segment-name"
                    maxLength={100}
                    status={errors.name ? "error" : undefined}
                  />
                )}
              />
              {errors.name ? <div className={styles.error}>{errors.name.message}</div> : null}
            </div>
            <div>
              <label className={styles.label} htmlFor="customer-segment-color">
                Color *
              </label>
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
                          <span
                            aria-hidden
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: option.value,
                            }}
                          />
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
              <label className={styles.label} htmlFor="customer-segment-description">
                Description
              </label>
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
              {errors.description ? (
                <div className={styles.error}>{errors.description.message}</div>
              ) : null}
            </div>
          </div>
        </Paper>

        <Paper>
          <PaperHeader title="Definition & state" icon={<InfoCircleOutlined />} />
          <Flex vertical gap="middle">
            <div className={styles.fields}>
              <div>
                <label className={styles.label}>Segment type</label>
                <Select
                  value={segmentType}
                  disabled={isEdit}
                  options={Object.values(CustomerSegmentType).map((value) => ({
                    value,
                    label: value.toLowerCase(),
                  }))}
                  onChange={(value) => {
                    setSegmentType(value);
                    setValidation(null);
                    setPreviewCount(null);
                    setAdvancedDirty(true);
                  }}
                  style={{ width: "100%" }}
                />
                {isEdit ? <div className={styles.help}>Segment type is immutable.</div> : null}
              </div>
              <div>
                <label className={styles.label}>Status</label>
                <Select
                  value={segmentStatus}
                  options={Object.values(CustomerSegmentStatus).map((value) => ({
                    value,
                    label: value.toLowerCase(),
                  }))}
                  onChange={(value) => {
                    setSegmentStatus(value);
                    setAdvancedDirty(true);
                  }}
                  style={{ width: "100%" }}
                />
              </div>
            </div>
            {segmentType === CustomerSegmentType.Dynamic ? (
              <>
                <div>
                  <label className={styles.label}>Visual condition builder</label>
                  <Flex vertical gap="small">
                    {builderConditions.map((condition) => {
                      const attribute = visualAttributes.find(
                        (item) => item.name === condition.attribute,
                      );
                      const valueless =
                        condition.operator === "is_null" || condition.operator === "is_not_null";
                      return (
                        <div className={styles.builderRow} key={condition.id}>
                          <Select
                            showSearch
                            value={condition.attribute}
                            options={visualAttributes.map((item) => ({
                              value: item.name,
                              label: `${item.name} · ${item.kind.toLowerCase()}`,
                            }))}
                            onChange={(value) => {
                              const next = visualAttributes.find((item) => item.name === value);
                              updateBuilderCondition(condition.id, {
                                attribute: value,
                                operator: next?.operators[0] ?? "eq",
                                value: "",
                                upperValue: "",
                              });
                            }}
                          />
                          <Select
                            value={condition.operator}
                            options={(attribute?.operators ?? []).map((operator) => ({
                              value: operator,
                              label: operatorLabel(operator),
                            }))}
                            onChange={(operator) =>
                              updateBuilderCondition(condition.id, { operator })
                            }
                          />
                          <Flex gap="small">
                            {valueless ? (
                              <Input value="No value" disabled />
                            ) : attribute?.enumValues.length &&
                              condition.operator !== "in" &&
                              condition.operator !== "not_in" ? (
                              <Select
                                value={condition.value || undefined}
                                placeholder="Value"
                                options={attribute.enumValues.map((value) => ({
                                  value,
                                  label: value,
                                }))}
                                onChange={(value) =>
                                  updateBuilderCondition(condition.id, { value })
                                }
                                style={{ width: "100%" }}
                              />
                            ) : attribute?.valueType === "Boolean" ? (
                              <Select
                                value={condition.value || undefined}
                                placeholder="Value"
                                options={[
                                  { value: "TRUE", label: "true" },
                                  { value: "FALSE", label: "false" },
                                ]}
                                onChange={(value) =>
                                  updateBuilderCondition(condition.id, { value })
                                }
                                style={{ width: "100%" }}
                              />
                            ) : (
                              <Input
                                value={condition.value}
                                placeholder={
                                  condition.operator === "in" || condition.operator === "not_in"
                                    ? "Comma-separated values"
                                    : "Value"
                                }
                                onChange={(event) =>
                                  updateBuilderCondition(condition.id, {
                                    value: event.target.value,
                                  })
                                }
                              />
                            )}
                            {condition.operator === "between" ? (
                              <Input
                                value={condition.upperValue}
                                placeholder="Upper value"
                                onChange={(event) =>
                                  updateBuilderCondition(condition.id, {
                                    upperValue: event.target.value,
                                  })
                                }
                              />
                            ) : null}
                          </Flex>
                          <Button
                            type="text"
                            danger
                            aria-label="Remove condition"
                            icon={<DeleteOutlined />}
                            onClick={() => {
                              setBuilderConditions((current) =>
                                current.filter((item) => item.id !== condition.id),
                              );
                              setAdvancedDirty(true);
                            }}
                          />
                        </div>
                      );
                    })}
                    <div className={styles.builderActions}>
                      <Button
                        onClick={addBuilderCondition}
                        disabled={visualAttributes.length === 0}
                      >
                        Add condition
                      </Button>
                      <Select
                        value={builderJoin}
                        options={[
                          { value: "AND", label: "Match all (AND)" },
                          { value: "OR", label: "Match any (OR)" },
                        ]}
                        onChange={(value: "AND" | "OR") => {
                          setBuilderJoin(value);
                          setAdvancedDirty(true);
                        }}
                        style={{ minWidth: 160 }}
                      />
                      <Button
                        type="primary"
                        ghost
                        onClick={applyVisualBuilder}
                        disabled={builderConditions.length === 0}
                      >
                        Apply to query
                      </Button>
                    </div>
                    <div className={styles.help}>
                      Attribute types and operators come from the server catalog. Aggregate
                      functions remain available in the advanced editor below.
                    </div>
                  </Flex>
                </div>
                {catalogQuery.error ? (
                  <Alert
                    type="error"
                    showIcon
                    message="Could not load the segment attribute catalog"
                  />
                ) : null}
                <div>
                  <label className={styles.label}>Insert function template</label>
                  <Select
                    showSearch
                    value={null}
                    loading={catalogQuery.loading}
                    placeholder="Choose a server-defined function"
                    options={catalog
                      .filter((item) => item.kind === "FUNCTION")
                      .map((item) => ({
                        value: item.name,
                        label: item.name,
                        disabled: item.availability !== "AVAILABLE",
                        title: item.unavailabilityReason ?? undefined,
                      }))}
                    onChange={(value) => {
                      setQuery(
                        (current) =>
                          `${current}${current.trim() ? " AND " : ""}${value} MATCHES ()`,
                      );
                      setValidation(null);
                      setPreviewCount(null);
                      setAdvancedDirty(true);
                    }}
                    style={{ width: "100%" }}
                  />
                </div>
                <div>
                  <label className={styles.label} htmlFor="customer-segment-query">
                    Advanced query
                  </label>
                  <Input.TextArea
                    id="customer-segment-query"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setValidation(null);
                      setPreviewCount(null);
                      setAdvancedDirty(true);
                    }}
                    rows={6}
                    style={{ fontFamily: "monospace" }}
                    status={validation && !validation.valid ? "error" : undefined}
                  />
                </div>
                <Flex gap="small" wrap>
                  <Button loading={validating} onClick={() => void handleValidateQuery()}>
                    Validate query
                  </Button>
                  <Button loading={previewing} onClick={() => void handlePreview()}>
                    Preview customers
                  </Button>
                  {validation ? (
                    <Tag color={validation.valid ? "success" : "error"}>
                      {validation.valid
                        ? `Valid · complexity ${validation.complexity ?? 0}`
                        : "Invalid query"}
                    </Tag>
                  ) : null}
                  {previewCount !== null ? (
                    <Tag color="blue">{previewCount} matching customers</Tag>
                  ) : null}
                </Flex>
                {validation?.diagnostics.length ? (
                  <Alert
                    type={validation.valid ? "warning" : "error"}
                    showIcon
                    message="Query diagnostics"
                    description={validation.diagnostics.map((item) => (
                      <div key={`${item.code}:${item.line}:${item.column}`}>
                        <code>{item.code}</code> at {item.line}:{item.column} — {item.message}
                      </div>
                    ))}
                  />
                ) : null}
              </>
            ) : null}
          </Flex>
        </Paper>

        <Paper>
          <PaperHeader title="Customers" icon={<TeamOutlined />} />
          <Flex vertical gap="middle">
            <Flex
              align="center"
              justify="space-between"
              gap="middle"
              wrap
              className={styles.membershipCard}
            >
              <div>
                <Typography.Title level={3} className={styles.memberCount}>
                  {segment?.customersCount ?? 0}
                </Typography.Title>
                <Typography.Text type="secondary">
                  {segmentType === CustomerSegmentType.Dynamic
                    ? "customers in the current published materialization"
                    : "customers assigned manually"}
                </Typography.Text>
              </div>
              {isEdit && segment?.type === CustomerSegmentType.Manual ? (
                <Tooltip
                  title={isDirty ? "Save segment details before changing customers" : undefined}
                >
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
                <Typography.Text type="secondary">
                  Dynamic membership is managed by the segment definition.
                </Typography.Text>
              ) : (
                <Typography.Text type="secondary">
                  Create the segment before assigning customers.
                </Typography.Text>
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

const OPERATOR_LABELS: Record<string, string> = {
  eq: "=",
  neq: "!=",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  between: "BETWEEN",
  in: "IN",
  not_in: "NOT IN",
  is_null: "IS NULL",
  is_not_null: "IS NOT NULL",
  contains: "CONTAINS",
  not_contains: "NOT CONTAINS",
};

function operatorLabel(operator: string): string {
  return OPERATOR_LABELS[operator] ?? operator;
}

function printBuilderCondition(condition: BuilderCondition, attribute: SegmentCatalogItem): string {
  const operator = operatorLabel(condition.operator);
  if (condition.operator === "is_null" || condition.operator === "is_not_null") {
    return `${condition.attribute} ${operator}`;
  }
  if (condition.operator === "between") {
    return `${condition.attribute} BETWEEN ${builderLiteral(condition.value, attribute)} AND ${builderLiteral(condition.upperValue, attribute)}`;
  }
  if (condition.operator === "in" || condition.operator === "not_in") {
    const values = condition.value
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    return `${condition.attribute} ${operator} (${values.map((value) => builderLiteral(value, attribute)).join(", ")})`;
  }
  return `${condition.attribute} ${operator} ${builderLiteral(condition.value, attribute)}`;
}

function builderLiteral(value: string, attribute: SegmentCatalogItem): string {
  if (["String", "Enum", "ID"].includes(attribute.valueType)) {
    return `'${value
      .replaceAll("\\", "\\\\")
      .replaceAll("'", "\\'")
      .replaceAll("\n", "\\n")
      .replaceAll("\r", "\\r")
      .replaceAll("\t", "\\t")}'`;
  }
  if (attribute.valueType === "Boolean") return value.toUpperCase();
  return value;
}
