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
} from "ag-grid-community";
import {
  Alert,
  App,
  Button,
  Empty,
  Flex,
  Input,
  Select,
  Skeleton,
  Switch,
  Tag,
  Typography,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { createStyles } from "antd-style";
import {
  ModalHeader,
  ModalLayout,
  useModalStack,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useAgGridTheme } from "@/hooks";
import { useStore } from "@/domains/workspace";
import type { ApiProduct } from "@/graphql/types";
import type { IPickableEntity } from "@/shared/components/entity-picker-modal/types";
import { useSearchEditorContext } from "../../hooks";
import { hasVersionConflict, mapSearchEditorErrors } from "../../mappers";
import type { IProductBoostModalPayload } from "../../modals";
import {
  useCreateProductBoost,
  useDeleteProductBoost,
  useProductBoost,
  useUpdateProductBoost,
} from "../hooks";
import {
  buildProductBoostCreateInput,
  buildProductBoostUpdateInput,
} from "../mappers";
import {
  productBoostFormSchema,
  type ProductBoostFormValues,
} from "./schema";

ModuleRegistry.registerModules([AllCommunityModule]);

type SelectedProduct = Omit<
  ProductBoostFormValues["products"][number],
  "media"
> & { media?: ApiProduct["media"] };

const useStyles = createStyles(({ token }) => ({
  fields: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(220px, 1fr)",
    gap: token.padding,
    "@media (max-width: 640px)": { gridTemplateColumns: "1fr" },
  },
  label: { display: "block", marginBottom: 6, fontWeight: 500 },
  error: { color: token.colorError, fontSize: 12, marginTop: 4 },
  phraseRow: {
    display: "grid",
    gridTemplateColumns: "28px minmax(0, 1fr) auto",
    gap: 8,
    alignItems: "start",
  },
  phraseNumber: { paddingTop: 6, color: token.colorTextSecondary },
  grid: { width: "100%", minHeight: 104 },
  sectionHelp: { color: token.colorTextSecondary, fontSize: 13 },
}));

const defaultValues: ProductBoostFormValues = {
  name: "",
  locale: "",
  enabled: true,
  phrases: [{ value: "" }],
  products: [],
};

function getProductImage(product: SelectedProduct): string | null {
  if (product.image !== undefined) return product.image ?? null;
  return (
    [...(product.media ?? [])]
      .sort((left, right) => left.sortIndex - right.sortIndex)[0]?.file.url ?? null
  );
}

function getProductStatus(product: SelectedProduct): string {
  if (product.status) return product.status;
  return product.isPublished ? "Published" : "Draft";
}

function ProductCell({
  data,
  error,
}: CustomCellRendererProps<SelectedProduct> & { error?: string }) {
  if (!data) return null;
  const image = getProductImage(data);
  return (
    <Flex align="center" gap={8} style={{ minWidth: 0 }}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" width={32} height={32} style={{ objectFit: "cover", borderRadius: 4 }} />
      ) : null}
      <Flex vertical style={{ minWidth: 0 }}>
        <Typography.Text ellipsis={{ tooltip: data.title ?? data.id }}>
          {data.title || `Unavailable product · ${data.id}`}
        </Typography.Text>
        {error ? <Typography.Text type="danger" style={{ fontSize: 10 }}>{error}</Typography.Text> : null}
      </Flex>
    </Flex>
  );
}

export function ProductBoostModal() {
  const { styles } = useStyles();
  const agGridTheme = useAgGridTheme();
  const { message, modal } = App.useApp();
  const { push } = useModalStack();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const typedPayload = payload as IProductBoostModalPayload;
  const isEdit = typedPayload.mode === "edit";
  const store = useStore();
  const contextQuery = useSearchEditorContext(isEdit);
  const detailQuery = useProductBoost(typedPayload.entityId, !isEdit);
  const { createProductBoost, loading: creating } = useCreateProductBoost();
  const { updateProductBoost, loading: updating } = useUpdateProductBoost();
  const { deleteProductBoost, loading: deleting } = useDeleteProductBoost();
  const saving = creating || updating || deleting;
  const [globalErrors, setGlobalErrors] = useState<string[]>([]);
  const [versionConflict, setVersionConflict] = useState(false);
  const phraseInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    getValues,
    setValue,
    formState: { errors, isDirty, isValid },
  } = useForm<ProductBoostFormValues>({
    resolver: zodResolver(productBoostFormSchema),
    defaultValues,
    mode: "onChange",
  });
  const phrases = useFieldArray({ control, name: "phrases" });
  const products = useWatch({ control, name: "products" }) as SelectedProduct[];

  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);

  useEffect(() => {
    if (!isEdit || !detailQuery.productBoost) return;
    const boost = detailQuery.productBoost;
    reset({
      name: boost.name,
      locale: boost.locale,
      enabled: boost.enabled,
      phrases: [...boost.phrases]
        .sort((left, right) => left.position - right.position)
        .map(({ phrase }) => ({ value: phrase })),
      products: boost.products as unknown as ProductBoostFormValues["products"],
    });
  }, [detailQuery.productBoost, isEdit, reset]);

  const settings = isEdit ? detailQuery.settings : contextQuery.settings;
  const loading = isEdit ? detailQuery.loading : contextQuery.loading;
  const loadError = isEdit ? detailQuery.error : contextQuery.error;
  const hasProductDataMismatch = Boolean(
    isEdit &&
      detailQuery.productBoost &&
      detailQuery.productBoost.productsCount !==
        detailQuery.productBoost.products.length,
  );

  const localeOptions = useMemo(
    () =>
      (store?.locales ?? []).map((locale) => ({
        value: locale,
        label: `${new Intl.DisplayNames(["en"], { type: "language" }).of(locale) ?? locale} (${locale})`,
      })),
    [store?.locales],
  );

  const removeProduct = useCallback(
    (id: string) => {
      const current = getValues("products");
      setValue(
        "products",
        current.filter((product) => product.id !== id),
        { shouldDirty: true, shouldValidate: true },
      );
      clearErrors("products");
    },
    [clearErrors, getValues, setValue],
  );

  const productColumns = useMemo<ColDef<SelectedProduct>[]>(
    () => [
      {
        headerName: "Product",
        field: "title",
        cellRenderer: (props: CustomCellRendererProps<SelectedProduct>) => {
          const index = products.findIndex((product) => product.id === props.data?.id);
          return <ProductCell {...props} error={errors.products?.[index]?.id?.message} />;
        },
        flex: 1,
        minWidth: 260,
        sortable: false,
      },
      {
        headerName: "Status",
        valueGetter: ({ data }) => (data ? getProductStatus(data) : ""),
        cellRenderer: ({ value }: CustomCellRendererProps<SelectedProduct>) => (
          <Tag color={String(value).toLowerCase() === "published" ? "success" : "default"}>
            {value}
          </Tag>
        ),
        width: 120,
        sortable: false,
      },
      {
        headerName: "Actions",
        cellRenderer: ({ data }: CustomCellRendererProps<SelectedProduct>) =>
          data ? (
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              aria-label={`Remove ${data.title ?? data.id}`}
              onClick={() => removeProduct(data.id)}
            />
          ) : null,
        width: 92,
        sortable: false,
      },
    ],
    [errors.products, products, removeProduct],
  );

  const openProductPicker = useCallback(() => {
    const currentProducts = getValues("products") as SelectedProduct[];
    push("product-picker", {
      selectionMode: "multi",
      initialSelection: currentProducts.map(({ id }) => id),
      maxSelection: 50,
      onConfirm: (entities: IPickableEntity[], ids: string[]) => {
        const byId = new Map<string, SelectedProduct>(
          currentProducts.map((product) => [product.id, product]),
        );
        entities.forEach((entity) => byId.set(entity.id, entity));
        setValue(
          "products",
          ids
            .map((id) => byId.get(id))
            .filter((product): product is SelectedProduct => Boolean(product)),
          { shouldDirty: true, shouldValidate: true },
        );
        clearErrors("products");
      },
    });
  }, [clearErrors, getValues, push, setValue]);

  const appendPhrase = useCallback(() => {
    if (phrases.fields.length >= 20) return;
    phrases.append({ value: "" });
    requestAnimationFrame(() => phraseInputRefs.current[phrases.fields.length]?.focus());
  }, [phrases]);

  const handleApiErrors = useCallback(
    (apiErrors: Parameters<typeof mapSearchEditorErrors>[0]) => {
      clearErrors();
      const global: string[] = [];
      for (const error of mapSearchEditorErrors(apiErrors)) {
        if (error.target === "name" || error.target === "locale" || error.target === "enabled") {
          setError(error.target, { message: error.message });
        } else if (error.target === "phrases") {
          setError("phrases", { message: error.message });
        } else if (error.target === "products") {
          setError("products", { message: error.message });
        } else if (error.target.startsWith("phrases.")) {
          const index = Number(error.target.split(".")[1]);
          setError(`phrases.${index}.value`, { message: error.message });
        } else if (error.target.startsWith("products.")) {
          const index = Number(error.target.split(".")[1]);
          setError(`products.${index}.id`, { message: error.message });
        } else {
          global.push(error.message);
        }
      }
      setGlobalErrors(global);
    },
    [clearErrors, setError],
  );

  const onSubmit = useCallback(
    async (values: ProductBoostFormValues) => {
      if (!settings) return;
      setGlobalErrors([]);
      setVersionConflict(false);
      const current = detailQuery.productBoost;
      const result = isEdit && current
        ? await updateProductBoost(
          buildProductBoostUpdateInput(values, current.id, current.version),
        )
        : await createProductBoost(buildProductBoostCreateInput(values));

      if (!result.productBoost || result.userErrors.length > 0) {
        if (hasVersionConflict(result.userErrors)) setVersionConflict(true);
        handleApiErrors(result.userErrors);
        return;
      }

      await typedPayload.onSaved?.();
      setDirty(false);
      message.success(isEdit ? "Product boost updated" : "Product boost created");
      forcePop();
    },
    [
      forcePop,
      handleApiErrors,
      isEdit,
      message,
      setDirty,
      settings,
      typedPayload,
      createProductBoost,
      detailQuery.productBoost,
      updateProductBoost,
    ],
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

  const handleDelete = useCallback(async () => {
    const current = detailQuery.productBoost;
    if (!current) return;

    const confirmed = await modal.confirm({
      title: "Delete product boost?",
      content: current.name,
      okText: "Delete",
      okButtonProps: { danger: true },
    });
    if (!confirmed) return;

    const result = await deleteProductBoost({
      id: current.id,
      expectedVersion: current.version,
    });
    if (result.userErrors.length > 0) {
      message.error(result.userErrors[0].message);
      return;
    }

    await typedPayload.onSaved?.();
    setDirty(false);
    message.success("Product boost deleted");
    forcePop();
  }, [deleteProductBoost, detailQuery.productBoost, forcePop, message, modal, setDirty, typedPayload]);

  const title = isEdit ? "Edit product boost" : "New product boost";
  const submitLabel = isEdit ? "Save" : "Create";
  const submitDisabled =
    loading ||
    saving ||
    !settings ||
    !isValid ||
    (isEdit && !isDirty) ||
    hasProductDataMismatch ||
    versionConflict;

  if (loading) {
    return (
      <ModalLayout
        name="product-boost"
        header={<ModalHeader title={title} onClose={pop} submitButtonProps={{ disabled: true, children: submitLabel }} />}
      >
        <Skeleton active paragraph={{ rows: 12 }} />
      </ModalLayout>
    );
  }

  if (isEdit && !detailQuery.productBoost) {
    return (
      <ModalLayout name="product-boost" headerProps={{ title, onClose: pop, submitButtonProps: null }}>
        <Alert type="error" showIcon message="Product boost not found" action={<Button onClick={pop}>Close</Button>} />
      </ModalLayout>
    );
  }

  return (
    <ModalLayout
      name="product-boost"
      header={
        <ModalHeader
          name="product-boost"
          title={title}
          onClose={pop}
          submitButtonProps={{
            children: submitLabel,
            loading: saving,
            disabled: submitDisabled,
            onClick: handleSubmit(onSubmit),
          }}
          extra={isEdit ? <Button danger size="small" loading={deleting} data-testid="product-boost-delete-button" onClick={handleDelete}>Delete</Button> : null}
        />
      }
    >
      {loadError ? <Alert role="alert" type="error" showIcon message={loadError.message} /> : null}
      {globalErrors.length ? <Alert role="alert" type="error" showIcon message="Could not save product boost" description={globalErrors.join(" ")} /> : null}
      {versionConflict ? (
        <Alert
          role="alert"
          type="warning"
          showIcon
          message="This product boost changed after this form was opened."
          action={<Button onClick={reloadLatest}>Reload latest data</Button>}
        />
      ) : null}
      {!settings ? (
        <Alert
          role="alert"
          type="warning"
          showIcon
          message="Search settings must be configured before boosts or synonyms can be created."
          action={<Button onClick={() => window.location.assign(window.location.pathname.replace(/\/search\/product-boosts$/, "/search/settings"))}>Open search settings</Button>}
        />
      ) : null}
      {hasProductDataMismatch ? (
        <Alert role="alert" type="warning" showIcon message="Some boosted products are unavailable. Saving is disabled to prevent accidental removal." />
      ) : null}

      <Paper>
        <PaperHeader title="General" />
        <div className={styles.fields}>
          <div>
            <label className={styles.label} htmlFor="product-boost-name">Name *</label>
            <Controller name="name" control={control} render={({ field }) => <Input {...field} id="product-boost-name" maxLength={128} showCount status={errors.name ? "error" : undefined} aria-describedby={errors.name ? "product-boost-name-error" : undefined} />} />
            {errors.name ? <div id="product-boost-name-error" className={styles.error}>{errors.name.message}</div> : null}
          </div>
          <div>
            <label className={styles.label} htmlFor="product-boost-locale">Locale *</label>
            <Controller name="locale" control={control} render={({ field }) => <Select {...field} id="product-boost-locale" showSearch optionFilterProp="label" options={localeOptions} style={{ width: "100%" }} status={errors.locale ? "error" : undefined} />} />
            {errors.locale ? <div className={styles.error}>{errors.locale.message}</div> : null}
          </div>
        </div>
        <Flex align="center" gap={10} style={{ marginTop: 16 }}>
          <Controller name="enabled" control={control} render={({ field }) => <Switch checked={field.value} onChange={field.onChange} aria-label="Enabled" />} />
          <div><Typography.Text strong>Enabled</Typography.Text><br /><Typography.Text type="secondary">Apply this boost in storefront search</Typography.Text></div>
        </Flex>
        {errors.enabled ? <div className={styles.error}>{errors.enabled.message}</div> : null}
      </Paper>

      <Paper>
        <PaperHeader title="Trigger phrases" actions={<Typography.Text type="secondary">{phrases.fields.length} / 20</Typography.Text>} />
        <Typography.Paragraph className={styles.sectionHelp}>Search queries that activate this boost.</Typography.Paragraph>
        <Flex vertical gap={8}>
          {phrases.fields.map((field, index) => (
            <div className={styles.phraseRow} key={field.id}>
              <span className={styles.phraseNumber}>{index + 1}</span>
              <div>
                <Controller
                  name={`phrases.${index}.value`}
                  control={control}
                  render={({ field: inputField }) => (
                    <Input
                      {...inputField}
                      ref={(element) => { inputField.ref(element); phraseInputRefs.current[index] = element?.input ?? null; }}
                      aria-label={`Trigger phrase ${index + 1}`}
                      status={errors.phrases?.[index]?.value ? "error" : undefined}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && index === phrases.fields.length - 1 && inputField.value.trim()) { event.preventDefault(); appendPhrase(); }
                        if (event.key === "Backspace" && !inputField.value && phrases.fields.length > 1) { event.preventDefault(); phrases.remove(index); }
                      }}
                    />
                  )}
                />
                {errors.phrases?.[index]?.value ? <div className={styles.error}>{errors.phrases[index]?.value?.message}</div> : null}
              </div>
              <Flex>
                <Button type="text" size="small" icon={<ArrowUpOutlined />} aria-label={`Move trigger phrase ${index + 1} up`} disabled={index === 0} onClick={() => phrases.move(index, index - 1)} />
                <Button type="text" size="small" icon={<ArrowDownOutlined />} aria-label={`Move trigger phrase ${index + 1} down`} disabled={index === phrases.fields.length - 1} onClick={() => phrases.move(index, index + 1)} />
                <Button type="text" danger size="small" icon={<DeleteOutlined />} aria-label={`Remove trigger phrase ${index + 1}`} disabled={phrases.fields.length === 1} onClick={() => phrases.remove(index)} />
              </Flex>
            </div>
          ))}
        </Flex>
        <Button type="link" icon={<PlusOutlined />} onClick={appendPhrase} disabled={phrases.fields.length >= 20}>Add phrase</Button>
        {typeof errors.phrases?.message === "string" ? <div className={styles.error}>{errors.phrases.message}</div> : null}
      </Paper>

      <Paper>
        <PaperHeader title="Boosted products" actions={<Typography.Text type="secondary">{products.length} / 50</Typography.Text>} />
        <Typography.Paragraph className={styles.sectionHelp}>Products shown higher for matching queries.</Typography.Paragraph>
        {products.length ? (
          <div className={styles.grid} style={{ height: Math.min(280, 40 + products.length * 48) }} data-testid="product-boost-selected-products-grid">
            <AgGridReact<SelectedProduct>
              theme={agGridTheme}
              rowData={products}
              columnDefs={productColumns}
              getRowId={({ data }) => data.id}
              rowHeight={48}
              headerHeight={40}
              suppressMovableColumns
              suppressCellFocus={false}
              defaultColDef={{ resizable: false }}
            />
          </div>
        ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No products selected" />}
        <Button type="link" icon={<PlusOutlined />} onClick={openProductPicker}>Select products</Button>
        {typeof errors.products?.message === "string" ? <div className={styles.error}>{errors.products.message}</div> : null}
      </Paper>
    </ModalLayout>
  );
}
