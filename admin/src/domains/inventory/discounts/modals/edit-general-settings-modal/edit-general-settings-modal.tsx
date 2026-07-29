"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Alert,
  App,
  Button,
  Dropdown,
  Flex,
  Input,
  InputNumber,
  Select,
  Typography,
} from "antd";
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
} from "ag-grid-community";
import { AgGridReact, type CustomCellRendererProps } from "ag-grid-react";
import {
  LuEllipsis as MoreOutlined,
  LuPlus as PlusOutlined,
  LuTrash2 as DeleteOutlined,
} from "react-icons/lu";
import { useAgGridTheme } from "@/hooks";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { DiscountCodeStatus, DiscountMethod } from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useUpdateDiscount } from "../../hooks";
import {
  buildDiscountGeneralUpdateInput,
  createDiscountGeneralFormValues,
  validateDiscountGeneralForm,
  type DiscountCodeEditorRow,
  type DiscountGeneralFormValues,
} from "../../mappers";
import type { IDiscountGeneralEditModalPayload } from "../../modals";
import { useEditGeneralSettingsModalStyles } from "./edit-general-settings-modal.styles";

ModuleRegistry.registerModules([AllCommunityModule]);

interface GridContext {
  updateRow: (
    key: string,
    changes: Partial<DiscountCodeEditorRow>,
  ) => void;
  removeRow: (key: string) => void;
}

function getGridContext(
  params: CustomCellRendererProps<DiscountCodeEditorRow>,
): GridContext {
  return params.context as GridContext;
}

function CodeCell(params: CustomCellRendererProps<DiscountCodeEditorRow>) {
  const { styles } = useEditGeneralSettingsModalStyles();
  if (!params.data) return null;

  return (
    <Input
      aria-label="Discount code"
      className={styles.cellControl}
      value={params.data.code}
      placeholder="Enter code"
      onChange={(event) =>
        getGridContext(params).updateRow(params.data!.key, {
          code: event.target.value,
        })
      }
    />
  );
}

function StatusCell(params: CustomCellRendererProps<DiscountCodeEditorRow>) {
  const { styles } = useEditGeneralSettingsModalStyles();
  if (!params.data) return null;

  return (
    <Select
      aria-label="Discount code status"
      className={styles.cellControl}
      value={params.data.status}
      disabled={!params.data.id}
      options={[
        { value: DiscountCodeStatus.Active, label: "Active" },
        { value: DiscountCodeStatus.Disabled, label: "Disabled" },
      ]}
      onChange={(status) =>
        getGridContext(params).updateRow(params.data!.key, { status })
      }
    />
  );
}

function UsageLimitCell(
  params: CustomCellRendererProps<DiscountCodeEditorRow>,
) {
  const { styles } = useEditGeneralSettingsModalStyles();
  if (!params.data) return null;

  return (
    <InputNumber
      aria-label="Discount code usage limit"
      className={styles.cellControl}
      min={1}
      precision={0}
      value={params.data.usageLimit}
      placeholder="No limit"
      onChange={(usageLimit) =>
        getGridContext(params).updateRow(params.data!.key, {
          usageLimit,
        })
      }
    />
  );
}

function ActionsCell(params: CustomCellRendererProps<DiscountCodeEditorRow>) {
  const { styles } = useEditGeneralSettingsModalStyles();
  if (!params.data) return null;

  return (
    <div className={styles.actionCell}>
      <Dropdown
        trigger={["click"]}
        menu={{
          items: [
            {
              key: "delete",
              label: "Delete",
              danger: true,
              icon: <DeleteOutlined />,
              "data-testid": "discount-code-delete-menu-item",
              onClick: () =>
                getGridContext(params).removeRow(params.data!.key),
            },
          ],
        }}
      >
        <Button
          type="text"
          size="small"
          aria-label={`Actions for ${params.data.code || "new discount code"}`}
          icon={<MoreOutlined />}
        />
      </Dropdown>
    </div>
  );
}

const serializeValues = (values: DiscountGeneralFormValues) =>
  JSON.stringify({
    title: values.title.trim(),
    priority: values.priority,
    codes: values.codes.map((row) => ({
      id: row.id,
      code: row.code.trim(),
      status: row.status,
      usageLimit: row.usageLimit,
    })),
  });

export function EditGeneralSettingsModal() {
  const { styles } = useEditGeneralSettingsModalStyles();
  const { message } = App.useApp();
  const agGridTheme = useAgGridTheme();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const typedPayload = payload as IDiscountGeneralEditModalPayload;
  const { discount, onSaved } = typedPayload;
  const mutation = useUpdateDiscount();
  const [values, setValues] = useState<DiscountGeneralFormValues>(() =>
    createDiscountGeneralFormValues(discount),
  );
  const [initialSnapshot] = useState(() =>
    serializeValues(createDiscountGeneralFormValues(discount)),
  );
  const [formError, setFormError] = useState<string | null>(null);

  const dirty = serializeValues(values) !== initialSnapshot;

  useEffect(() => {
    setDirty(dirty);
  }, [dirty, setDirty]);

  const updateRow = useCallback(
    (key: string, changes: Partial<DiscountCodeEditorRow>) => {
      setValues((current) => ({
        ...current,
        codes: current.codes.map((row) =>
          row.key === key ? { ...row, ...changes } : row,
        ),
      }));
      setFormError(null);
    },
    [],
  );

  const removeRow = useCallback((key: string) => {
    setValues((current) => ({
      ...current,
      codes: current.codes.filter((row) => row.key !== key),
    }));
    setFormError(null);
  }, []);

  const gridContext = useMemo<GridContext>(
    () => ({ updateRow, removeRow }),
    [removeRow, updateRow],
  );

  const columnDefs = useMemo<ColDef<DiscountCodeEditorRow>[]>(
    () => [
      {
        headerName: "Code",
        field: "code",
        flex: 1,
        minWidth: 240,
        cellRenderer: CodeCell,
      },
      {
        headerName: "Status",
        field: "status",
        width: 150,
        cellRenderer: StatusCell,
      },
      {
        headerName: "Usage limit",
        field: "usageLimit",
        width: 130,
        cellRenderer: UsageLimitCell,
      },
      {
        headerName: "",
        colId: "actions",
        width: 48,
        cellRenderer: ActionsCell,
      },
    ],
    [],
  );

  const addCode = useCallback(() => {
    const clientMutationId = crypto.randomUUID();
    setValues((current) => ({
      ...current,
      codes: [
        ...current.codes,
        {
          key: clientMutationId,
          clientMutationId,
          code: "",
          status: DiscountCodeStatus.Active,
          usageLimit: null,
        },
      ],
    }));
    setFormError(null);
  }, []);

  const save = useCallback(async () => {
    const validationErrors = validateDiscountGeneralForm(values);
    if (validationErrors.length > 0) {
      setFormError(validationErrors.join(" "));
      return;
    }

    const operations = buildDiscountGeneralUpdateInput(discount, values);
    const result = await mutation.updateDiscount({
      discountId: discount.id,
      expectedRevision: discount.revision,
      operations,
    });

    if (!result.discount || result.errors.length > 0) {
      setFormError(
        result.errors.map((error) => error.message).join(" ") ||
          "Unable to update discount.",
      );
      return;
    }

    setDirty(false);
    message.success("General settings updated");
    forcePop();

    if (onSaved) {
      void Promise.resolve(onSaved()).catch(() => {
        message.error("Discount saved, but the details could not be refreshed");
      });
    }
  }, [
    forcePop,
    message,
    mutation,
    onSaved,
    discount,
    setDirty,
    values,
  ]);

  const errorMessage = formError ?? mutation.error?.message ?? null;
  const isCodeDiscount = discount.method === DiscountMethod.Code;

  return (
    <ModalLayout
      name="discount-general-edit"
      header={
        <ModalHeader
          name="discount-general-edit"
          title="Edit general settings"
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
        {errorMessage ? (
          <Alert type="error" showIcon message={errorMessage} />
        ) : null}

        <Paper>
          <PaperHeader title="Definition" />
          <div className={styles.definitionGrid}>
            <div className={styles.field}>
              <Typography.Text strong className={styles.fieldLabel}>
                Title
              </Typography.Text>
              <Input
                aria-label="Discount title"
                value={values.title}
                maxLength={255}
                onChange={(event) => {
                  setValues((current) => ({
                    ...current,
                    title: event.target.value,
                  }));
                  setFormError(null);
                }}
              />
            </div>
            <div className={styles.field}>
              <Typography.Text strong className={styles.fieldLabel}>
                Priority
              </Typography.Text>
              <InputNumber
                aria-label="Discount priority"
                className={styles.cellControl}
                min={0}
                precision={0}
                value={values.priority}
                onChange={(priority) => {
                  setValues((current) => ({
                    ...current,
                    priority: priority ?? 0,
                  }));
                  setFormError(null);
                }}
              />
              <Typography.Text
                type="secondary"
                className={styles.fieldHelp}
              >
                Higher values are evaluated first.
              </Typography.Text>
            </div>
          </div>
        </Paper>

        {isCodeDiscount ? (
          <Paper className={styles.codesPaper}>
            <PaperHeader
              title="Discount codes"
              className={styles.codesHeader}
              actions={
                <Button size="small" icon={<PlusOutlined />} onClick={addCode}>
                  Add
                </Button>
              }
            />
            <div
              className={styles.gridFrame}
              data-testid="discount-codes-grid"
            >
              <AgGridReact<DiscountCodeEditorRow>
                theme={agGridTheme}
                rowData={values.codes}
                columnDefs={columnDefs}
                context={gridContext}
                defaultColDef={{
                  sortable: false,
                  resizable: false,
                  suppressHeaderMenuButton: true,
                }}
                getRowId={({ data }) => data.key}
                domLayout="autoHeight"
                headerHeight={40}
                rowHeight={52}
                suppressCellFocus
                suppressMovableColumns
                overlayNoRowsTemplate="No discount codes"
              />
            </div>
            <Flex
              align="center"
              justify="space-between"
              gap={16}
              className={styles.footer}
            >
              <Typography.Text
                type="secondary"
                className={styles.footerText}
              >
                Shown only for code-based discounts. Create, update and delete
                operations are submitted with this form.
              </Typography.Text>
              <Typography.Text
                type="secondary"
                className={styles.footerText}
              >
                {values.codes.length}{" "}
                {values.codes.length === 1 ? "code" : "codes"}
              </Typography.Text>
            </Flex>
          </Paper>
        ) : null}
      </div>
    </ModalLayout>
  );
}
