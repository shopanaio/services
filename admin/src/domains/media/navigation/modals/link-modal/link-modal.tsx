"use client";

import { useCallback, useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { App, Button, Flex, Input, Select, Typography } from "antd";
import { LuX as CloseOutlined } from "react-icons/lu";
import { createStyles } from "antd-style";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { Paper } from "@/ui-kit/paper";
import { navigationEntryOptions } from "../../mocks/navigation";
import type { NavigationLinkModalPayload } from "../../modals";
import type {
  NavigationLinkFormValues,
  NavigationLinkType,
  NavigationMenuItem,
} from "../../types";

const typeLabels: Record<NavigationLinkType, string> = {
  PRODUCT: "Product",
  CATEGORY: "Category",
  PAGE: "Page",
  LINK: "URL",
};

const useStyles = createStyles(({ token }) => ({
  content: { width: "100%", maxWidth: 600, marginInline: "auto" },
  label: {
    display: "block",
    marginBottom: token.marginXXS,
    fontWeight: 500,
  },
  field: { width: "100%", marginTop: token.margin },
  error: { color: token.colorError, fontSize: token.fontSizeSM, marginTop: 4 },
  slug: { marginTop: token.marginXS },
}));

export function NavigationLinkModal() {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const typedPayload = payload as NavigationLinkModalPayload;
  const original = typedPayload.link;
  const isNew = !original.id;
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, dirtyFields, isDirty, isValid },
  } = useForm<NavigationLinkFormValues>({
    mode: "onChange",
    defaultValues: structuredClone(original),
  });
  const type = useWatch({ control, name: "type" });
  const entry = useWatch({ control, name: "entry" });
  const slug = useWatch({ control, name: "slug" });

  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);

  const resetSource = useCallback(() => {
    setValue("entry", null, { shouldDirty: true, shouldValidate: true });
    setValue("type", null, { shouldDirty: true, shouldValidate: true });
    setValue("slug", "", { shouldDirty: true, shouldValidate: true });
  }, [setValue]);

  const resetButton = isNew ? (
    <Button onClick={resetSource} icon={<CloseOutlined />} />
  ) : null;

  const entryOptions = useMemo(
    () =>
      type && type !== "LINK"
        ? navigationEntryOptions[type].map((option) => ({
            value: option.id,
            label: option.title,
          }))
        : [],
    [type],
  );

  const setEntry = useCallback(
    (id: string) => {
      if (!type || type === "LINK") return;
      const selected = navigationEntryOptions[type].find((item) => item.id === id) ?? null;
      setValue("entry", selected, { shouldDirty: true, shouldValidate: true });
      setValue("slug", selected?.slug ?? "", { shouldDirty: true, shouldValidate: true });
      if (isNew && !dirtyFields.title && selected?.title) {
        setValue("title", selected.title, { shouldDirty: true, shouldValidate: true });
      }
    },
    [dirtyFields.title, isNew, setValue, type],
  );

  const submit = handleSubmit((values) => {
    if (!values.type) return;
    const item: NavigationMenuItem = {
      id: values.id ?? crypto.randomUUID(),
      title: values.title,
      slug: values.entry?.slug ?? values.slug,
      type: values.type,
      entry: values.entry,
      parentId: values.parentId,
      sortIndex: values.sortIndex,
      children: values.children ?? [],
    };
    typedPayload.onSaved(item);
    setDirty(false);
    message.success(isNew ? "Link added" : "Link updated");
    forcePop();
  });

  const sourceControl = (() => {
    if (type && type !== "LINK") {
      return (
        <div className={styles.field}>
          <label className={styles.label}>{typeLabels[type]} *</label>
          <Flex gap="small">
            <Select
              showSearch
              optionFilterProp="label"
              value={entry?.id}
              onChange={setEntry}
              options={entryOptions}
              style={{ width: "100%" }}
              placeholder={`Select ${typeLabels[type].toLowerCase()}`}
            />
            {resetButton}
          </Flex>
          {slug ? (
            <Typography.Text type="secondary" className={styles.slug} data-testid="link-slug">
              {slug}
            </Typography.Text>
          ) : null}
        </div>
      );
    }

    if (type === "LINK") {
      return (
        <div className={styles.field}>
          <label className={styles.label}>URL</label>
          <Flex gap="small">
            <Controller
              name="slug"
              control={control}
              rules={{ required: "URL is required" }}
              render={({ field }) => (
                <Input
                  {...field}
                  data-testid="link-url-field"
                  placeholder="https://..."
                  status={errors.slug ? "error" : undefined}
                />
              )}
            />
            {resetButton}
          </Flex>
          {errors.slug ? <div className={styles.error}>{errors.slug.message}</div> : null}
        </div>
      );
    }

    return (
      <div className={styles.field}>
        <label className={styles.label}>Source</label>
        <Controller
          name="type"
          control={control}
          rules={{ required: "Source is required" }}
          render={({ field }) => (
            <Select
              {...field}
              value={field.value ?? undefined}
              placeholder="Select source"
              data-testid="link-type-select"
              onChange={(value: NavigationLinkType) => {
                field.onChange(value);
                setValue("entry", null, { shouldDirty: true });
                setValue("slug", "", { shouldDirty: true });
              }}
              options={(Object.keys(typeLabels) as NavigationLinkType[]).map((value) => ({
                value,
                label: typeLabels[value],
                "data-testid": `link-type-${value}-item`,
              }))}
              style={{ width: "100%" }}
            />
          )}
        />
        {errors.type ? <div className={styles.error}>{errors.type.message}</div> : null}
      </div>
    );
  })();

  return (
    <ModalLayout
      name="navigation-link"
      header={
        <ModalHeader
          name="navigation-link"
          title={isNew ? "New menu item" : "Edit menu item"}
          onClose={pop}
          submitButtonProps={{
            children: "Save",
            disabled: !isDirty || !isValid,
            onClick: submit,
          }}
        />
      }
    >
      <div className={styles.content}>
        <Paper>
          <div>
            <label className={styles.label} htmlFor="link-title">Title *</label>
            <Controller
              name="title"
              control={control}
              rules={{ required: "Title is required" }}
              render={({ field }) => (
                <Input
                  {...field}
                  id="link-title"
                  data-testid="link-title-input"
                  placeholder="Title"
                  status={errors.title ? "error" : undefined}
                />
              )}
            />
            {errors.title ? <div className={styles.error}>{errors.title.message}</div> : null}
          </div>
          {sourceControl}
        </Paper>
      </div>
    </ModalLayout>
  );
}
