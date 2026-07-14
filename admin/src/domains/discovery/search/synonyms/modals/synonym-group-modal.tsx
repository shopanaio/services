"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AgGridReact } from "ag-grid-react";
import type { CustomCellRendererProps } from "ag-grid-react";
import {
  AllCommunityModule,
  type ColDef,
  ModuleRegistry,
  type RowDragEndEvent,
} from "ag-grid-community";
import {
  Alert,
  App,
  Button,
  Flex,
  Input,
  Select,
  Skeleton,
  Switch,
  Typography,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { createStyles } from "antd-style";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useAgGridTheme } from "@/hooks";
import { useStore } from "@/domains/workspace";
import { SearchSettingsOperationType } from "@/graphql/types";
import { useSearchEditorContext, useUpdateSearchSettings } from "../../hooks";
import { hasVersionConflict, mapSearchEditorErrors } from "../../mappers";
import type { ISynonymGroupModalPayload } from "../../modals";
import { useSynonymGroup } from "../hooks";
import { buildSynonymGroupOperation } from "../mappers";
import {
  synonymGroupFormSchema,
  type SynonymEditorRow,
  type SynonymGroupFormValues,
} from "./schema";

ModuleRegistry.registerModules([AllCommunityModule]);

const useStyles = createStyles(({ token }) => ({
  fields: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(220px, 1fr)",
    gap: token.padding,
    "@media (max-width: 640px)": { gridTemplateColumns: "1fr" },
  },
  label: { display: "block", marginBottom: 6, fontWeight: 500 },
  error: { color: token.colorError, fontSize: 12, marginTop: 4 },
  grid: { width: "100%" },
  invalidCell: { color: token.colorError },
  cellError: { fontSize: 10, lineHeight: 1.1, color: token.colorError },
  sectionHelp: { color: token.colorTextSecondary, fontSize: 13 },
  preview: {
    padding: token.paddingSM,
    marginTop: token.marginSM,
    borderRadius: token.borderRadius,
    background: token.colorFillAlter,
  },
}));

const createRow = (value = ""): SynonymEditorRow => ({
  rowId: crypto.randomUUID(),
  value,
});

function SynonymCell(
  props: CustomCellRendererProps<SynonymEditorRow> & { error?: string },
) {
  return (
    <Flex vertical justify="center" style={{ height: "100%", minWidth: 0 }}>
      <Typography.Text ellipsis={{ tooltip: props.value || undefined }}>
        {props.value || "Click to edit"}
      </Typography.Text>
      {props.error ? <span style={{ color: "var(--ant-color-error)", fontSize: 10 }}>{props.error}</span> : null}
    </Flex>
  );
}

export function SynonymGroupModal() {
  const { styles } = useStyles();
  const agGridTheme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<SynonymEditorRow>>(null);
  const { message, modal } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const typedPayload = payload as ISynonymGroupModalPayload;
  const isEdit = typedPayload.mode === "edit";
  const store = useStore();
  const contextQuery = useSearchEditorContext(isEdit);
  const detailQuery = useSynonymGroup(typedPayload.entityId, !isEdit);
  const { updateSearchSettings, loading: saving } = useUpdateSearchSettings();
  const [globalErrors, setGlobalErrors] = useState<string[]>([]);
  const [versionConflict, setVersionConflict] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isDirty, isValid },
  } = useForm<SynonymGroupFormValues>({
    resolver: zodResolver(synonymGroupFormSchema),
    defaultValues: {
      name: "",
      locale: "",
      enabled: true,
      values: [createRow(), createRow()],
    },
    mode: "onChange",
  });
  const valueFields = useFieldArray({ control, name: "values", keyName: "formId" });
  const rows = useWatch({ control, name: "values" });

  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);

  useEffect(() => {
    if (!isEdit || !detailQuery.synonymGroup) return;
    const group = detailQuery.synonymGroup;
    reset({
      name: group.name,
      locale: group.locale,
      enabled: group.enabled,
      values: [...group.values]
        .sort((left, right) => left.position - right.position)
        .map(({ value }) => createRow(value)),
    });
  }, [detailQuery.synonymGroup, isEdit, reset]);

  const settings = isEdit ? detailQuery.settings : contextQuery.settings;
  const loading = isEdit ? detailQuery.loading : contextQuery.loading;
  const loadError = isEdit ? detailQuery.error : contextQuery.error;
  const localeOptions = useMemo(
    () =>
      (store?.locales ?? []).map((locale) => ({
        value: locale,
        label: `${new Intl.DisplayNames(["en"], { type: "language" }).of(locale) ?? locale} (${locale})`,
      })),
    [store?.locales],
  );

  const focusRow = useCallback((index: number) => {
    requestAnimationFrame(() => {
      gridRef.current?.api.setFocusedCell(index, "value");
      gridRef.current?.api.startEditingCell({ rowIndex: index, colKey: "value" });
    });
  }, []);

  const appendRow = useCallback(() => {
    if (rows.length >= 20) return;
    valueFields.append(createRow());
    focusRow(rows.length);
  }, [focusRow, rows.length, valueFields]);

  const removeRow = useCallback(
    (rowId: string) => {
      if (rows.length <= 2) return;
      const index = rows.findIndex((row) => row.rowId === rowId);
      if (index < 0) return;
      valueFields.remove(index);
      clearErrors("values");
      focusRow(Math.max(0, Math.min(index, rows.length - 2)));
    },
    [clearErrors, focusRow, rows, valueFields],
  );

  const moveRow = useCallback(
    (from: number, to: number) => {
      if (to < 0 || to >= rows.length) return;
      valueFields.move(from, to);
      clearErrors("values");
      focusRow(to);
    },
    [clearErrors, focusRow, rows.length, valueFields],
  );

  const columnDefs = useMemo<ColDef<SynonymEditorRow>[]>(
    () => [
      { headerName: "", rowDrag: true, width: 42, sortable: false, resizable: false },
      {
        headerName: "#",
        valueGetter: ({ node }) => (node?.rowIndex ?? 0) + 1,
        width: 54,
        editable: false,
        sortable: false,
      },
      {
        headerName: "Synonym",
        field: "value",
        colId: "value",
        flex: 1,
        minWidth: 240,
        editable: true,
        singleClickEdit: true,
        cellRenderer: (props: CustomCellRendererProps<SynonymEditorRow>) => {
          const index = rows.findIndex((row) => row.rowId === props.data?.rowId);
          return <SynonymCell {...props} error={errors.values?.[index]?.value?.message} />;
        },
        cellClass: ({ data }) => {
          const index = rows.findIndex((row) => row.rowId === data?.rowId);
          return errors.values?.[index]?.value ? styles.invalidCell : undefined;
        },
      },
      {
        headerName: "Actions",
        width: 140,
        sortable: false,
        cellRenderer: ({ data }: CustomCellRendererProps<SynonymEditorRow>) => {
          const index = rows.findIndex((row) => row.rowId === data?.rowId);
          if (!data || index < 0) return null;
          return (
            <Flex>
              <Button type="text" size="small" icon={<ArrowUpOutlined />} aria-label={`Move synonym ${index + 1} up`} disabled={index === 0} onClick={() => moveRow(index, index - 1)} />
              <Button type="text" size="small" icon={<ArrowDownOutlined />} aria-label={`Move synonym ${index + 1} down`} disabled={index === rows.length - 1} onClick={() => moveRow(index, index + 1)} />
              <Button type="text" danger size="small" icon={<DeleteOutlined />} aria-label={`Remove synonym ${index + 1}`} disabled={rows.length <= 2} onClick={() => removeRow(data.rowId)} />
            </Flex>
          );
        },
      },
    ],
    [errors.values, moveRow, removeRow, rows, styles.invalidCell],
  );

  const handleRowDragEnd = useCallback(
    (event: RowDragEndEvent<SynonymEditorRow>) => {
      const ordered: SynonymEditorRow[] = [];
      event.api.forEachNode((node) => { if (node.data) ordered.push(node.data); });
      setValue("values", ordered, { shouldDirty: true, shouldValidate: true });
      clearErrors("values");
    },
    [clearErrors, setValue],
  );

  const handleApiErrors = useCallback(
    (apiErrors: Parameters<typeof mapSearchEditorErrors>[0]) => {
      clearErrors();
      const global: string[] = [];
      for (const error of mapSearchEditorErrors(apiErrors)) {
        if (error.target === "name" || error.target === "locale" || error.target === "enabled") {
          setError(error.target, { message: error.message });
        } else if (error.target === "values") {
          setError("values", { message: error.message });
        } else if (error.target.startsWith("values.")) {
          const index = Number(error.target.split(".")[1]);
          setError(`values.${index}.value`, { message: error.message });
        } else {
          global.push(error.message);
        }
      }
      const conflict = apiErrors.find((error) => error.code === "SYNONYM_CONFLICT");
      if (conflict) setError("values", { message: conflict.message });
      setGlobalErrors(global);
    },
    [clearErrors, setError],
  );

  const onSubmit = useCallback(
    async (values: SynonymGroupFormValues) => {
      if (!settings) return;
      setGlobalErrors([]);
      setVersionConflict(false);
      const operation = buildSynonymGroupOperation(values, isEdit ? typedPayload.entityId : undefined);
      const result = await updateSearchSettings(
        settings.version,
        { synonymGroups: [operation] },
        isEdit
          ? SearchSettingsOperationType.SynonymGroupUpdate
          : SearchSettingsOperationType.SynonymGroupCreate,
      );
      if (!result.applied) {
        if (hasVersionConflict(result.userErrors)) setVersionConflict(true);
        handleApiErrors(result.userErrors);
        return;
      }

      await typedPayload.onSaved?.();
      setDirty(false);
      message.success(isEdit ? "Synonym group updated" : "Synonym group created");
      forcePop();
    },
    [forcePop, handleApiErrors, isEdit, message, setDirty, settings, typedPayload, updateSearchSettings],
  );

  const reloadLatest = useCallback(async () => {
    if (isDirty) {
      const confirmed = await modal.confirm({
        title: "Replace unsaved changes?",
        content: "Reloading will replace this draft with the latest data.",
      });
      if (!confirmed) return;
    }
    await (isEdit ? detailQuery.refetch() : contextQuery.refetch());
    setVersionConflict(false);
    setGlobalErrors([]);
  }, [contextQuery, detailQuery, isDirty, isEdit, modal]);

  const validPreviewValues = rows.map(({ value }) => value.trim()).filter(Boolean);
  const title = isEdit ? "Edit synonym group" : "New synonym group";
  const submitLabel = isEdit ? "Save" : "Create";
  const submitDisabled = loading || saving || !settings || !isValid || (isEdit && !isDirty) || versionConflict;

  if (loading) {
    return (
      <ModalLayout name="synonym-group" header={<ModalHeader title={title} onClose={pop} submitButtonProps={{ disabled: true, children: submitLabel }} />}>
        <Skeleton active paragraph={{ rows: 10 }} />
      </ModalLayout>
    );
  }

  if (isEdit && !detailQuery.synonymGroup) {
    return (
      <ModalLayout name="synonym-group" headerProps={{ title, onClose: pop, submitButtonProps: null }}>
        <Alert type="error" showIcon message="Synonym group not found" action={<Button onClick={pop}>Close</Button>} />
      </ModalLayout>
    );
  }

  return (
    <ModalLayout
      name="synonym-group"
      header={<ModalHeader name="synonym-group" title={title} onClose={pop} submitButtonProps={{ children: submitLabel, loading: saving, disabled: submitDisabled, onClick: handleSubmit(onSubmit) }} />}
    >
      {loadError ? <Alert role="alert" type="error" showIcon message={loadError.message} /> : null}
      {globalErrors.length ? <Alert role="alert" type="error" showIcon message="Could not save synonym group" description={globalErrors.join(" ")} /> : null}
      {versionConflict ? <Alert role="alert" type="warning" showIcon message="Search configuration changed after this form was opened." action={<Button onClick={reloadLatest}>Reload latest data</Button>} /> : null}
      {!settings ? <Alert role="alert" type="warning" showIcon message="Search settings must be configured before boosts or synonyms can be created." action={<Button onClick={() => window.location.assign(window.location.pathname.replace(/\/search\/synonyms$/, "/search/settings"))}>Open search settings</Button>} /> : null}

      <Paper>
        <PaperHeader title="General" />
        <div className={styles.fields}>
          <div>
            <label className={styles.label} htmlFor="synonym-group-name">Name *</label>
            <Controller name="name" control={control} render={({ field }) => <Input {...field} id="synonym-group-name" maxLength={128} showCount status={errors.name ? "error" : undefined} aria-describedby={errors.name ? "synonym-group-name-error" : undefined} />} />
            {errors.name ? <div id="synonym-group-name-error" className={styles.error}>{errors.name.message}</div> : null}
          </div>
          <div>
            <label className={styles.label} htmlFor="synonym-group-locale">Locale *</label>
            <Controller name="locale" control={control} render={({ field }) => <Select {...field} id="synonym-group-locale" showSearch optionFilterProp="label" options={localeOptions} style={{ width: "100%" }} status={errors.locale ? "error" : undefined} />} />
            {errors.locale ? <div className={styles.error}>{errors.locale.message}</div> : null}
          </div>
        </div>
        <Flex align="center" gap={10} style={{ marginTop: 16 }}>
          <Controller name="enabled" control={control} render={({ field }) => <Switch checked={field.value} onChange={field.onChange} aria-label="Enabled" />} />
          <div><Typography.Text strong>Enabled</Typography.Text><br /><Typography.Text type="secondary">Expand matching queries with this group</Typography.Text></div>
        </Flex>
        {errors.enabled ? <div className={styles.error}>{errors.enabled.message}</div> : null}
      </Paper>

      <Paper>
        <PaperHeader title="Synonyms" actions={<Typography.Text type="secondary">{rows.length} / 20</Typography.Text>} />
        <Typography.Paragraph className={styles.sectionHelp}>Add terms or phrases with the same meaning.</Typography.Paragraph>
        <div className={styles.grid} style={{ height: Math.min(360, 40 + rows.length * 56) }} data-testid="synonym-group-values-grid">
          <AgGridReact<SynonymEditorRow>
            ref={gridRef}
            theme={agGridTheme}
            rowData={rows}
            columnDefs={columnDefs}
            getRowId={({ data }) => data.rowId}
            rowHeight={56}
            headerHeight={40}
            rowDragManaged
            animateRows
            suppressMovableColumns
            stopEditingWhenCellsLoseFocus
            onCellValueChanged={(event) => {
              if (!event.data) return;
              const index = rows.findIndex((row) => row.rowId === event.data?.rowId);
              if (index >= 0) setValue(`values.${index}.value`, String(event.newValue ?? ""), { shouldDirty: true, shouldValidate: true });
            }}
            onCellKeyDown={(event) => {
              if (
                (event.event as KeyboardEvent | undefined)?.key !== "Enter" ||
                !("column" in event) ||
                event.column.getColId() !== "value"
              ) return;
              const index = event.node.rowIndex ?? -1;
              if (index === rows.length - 1 && rows[index]?.value.trim()) appendRow();
            }}
            onRowDragEnd={handleRowDragEnd}
            defaultColDef={{ resizable: false }}
          />
        </div>
        <Button type="link" icon={<PlusOutlined />} onClick={appendRow} disabled={rows.length >= 20}>Add synonym</Button>
        {typeof errors.values?.message === "string" ? <div className={styles.error}>{errors.values.message}</div> : null}
        {validPreviewValues.length >= 2 ? <div className={styles.preview}><Typography.Text strong>Preview: </Typography.Text>{validPreviewValues.join(" ↔ ")}</div> : null}
      </Paper>
    </ModalLayout>
  );
}
