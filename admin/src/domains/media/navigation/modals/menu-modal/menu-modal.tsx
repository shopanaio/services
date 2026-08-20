"use client";

import { useCallback, useEffect, useMemo } from "react";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import { App, Button, Input, Select, Typography } from "antd";
import { LuPlus as PlusOutlined } from "react-icons/lu";
import { createStyles } from "antd-style";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { SortableTree, removeItem, replaceItem } from "../../components/sortable-tree";
import { useNavigationStore } from "../../store/navigation-store";
import type {
  NavigationLinkFormValues,
  NavigationMenuFormValues,
  NavigationMenuItem,
} from "../../types";
import type { NavigationMenuModalPayload } from "../../modals";
import { useNavigationLinkModal } from "../../modals";

const useStyles = createStyles(({ token }) => ({
  columns: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 2fr) minmax(240px, 1fr)",
    gap: token.padding,
    alignItems: "start",
    "@media (max-width: 760px)": { gridTemplateColumns: "1fr" },
  },
  column: { display: "flex", flexDirection: "column", gap: token.padding },
  fields: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: token.padding,
  },
  label: {
    display: "block",
    marginBottom: token.marginXXS,
    fontWeight: 500,
  },
  error: { color: token.colorError, fontSize: token.fontSizeSM, marginTop: 4 },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: token.paddingSM,
    marginTop: token.marginSM,
  },
  treeViewport: { overflowX: "auto" },
}));

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

export function NavigationMenuModal() {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const typedPayload = payload as NavigationMenuModalPayload;
  const menu = useNavigationStore((state) =>
    state.menus.find((item) => item.id === typedPayload.entityId),
  );
  const updateMenu = useNavigationStore((state) => state.updateMenu);
  const { push: openLinkModal } = useNavigationLinkModal();
  const methods = useForm<NavigationMenuFormValues>({
    mode: "onChange",
    defaultValues: {
      title: menu?.title ?? "",
      slug: menu?.slug ?? "",
      status: menu?.status ?? "DRAFT",
      menuItems: structuredClone(menu?.items ?? []),
    },
  });
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isDirty, isValid },
  } = methods;
  const watchedItems = useWatch({ control, name: "menuItems" });
  const items = useMemo(() => watchedItems ?? [], [watchedItems]);

  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);

  const setItems = useCallback(
    (next: NavigationMenuItem[]) =>
      setValue("menuItems", next, { shouldDirty: true, shouldValidate: true }),
    [setValue],
  );

  const openCreateLink = useCallback(() => {
    if (!menu) return;
    const link: NavigationLinkFormValues = {
      id: null,
      menuId: menu.id,
      title: "",
      slug: "",
      type: null,
      entry: null,
      parentId: null,
      sortIndex: items.length,
      children: [],
    };
    openLinkModal({
      link,
      onSaved: (created: NavigationMenuItem) => setItems([...items, created]),
    });
  }, [items, menu, openLinkModal, setItems]);

  const openEditLink = useCallback(
    (item: NavigationMenuItem) => {
      if (!menu) return;
      openLinkModal({
        link: { ...structuredClone(item), menuId: menu.id },
        onSaved: (updated: NavigationMenuItem) => setItems(replaceItem(items, updated)),
      });
    },
    [items, menu, openLinkModal, setItems],
  );

  const submit = handleSubmit((values) => {
    if (!menu) return;
    updateMenu(menu.id, values);
    setDirty(false);
    message.success("Menu updated");
    forcePop();
  });

  const title = menu?.title || "Edit menu";
  const statusOptions = useMemo(
    () => [
      { label: "Draft", value: "DRAFT" },
      { label: "Active", value: "ACTIVE" },
      { label: "Archived", value: "ARCHIVED" },
    ],
    [],
  );

  if (!menu) {
    return (
      <ModalLayout
        name="navigation-menu"
        headerProps={{ title: "Menu", onClose: pop, submitButtonProps: null }}
      >
        <Paper>
          <Typography.Text type="danger">Menu not found.</Typography.Text>
        </Paper>
      </ModalLayout>
    );
  }

  return (
    <FormProvider {...methods}>
      <ModalLayout
        name="navigation-menu"
        header={
          <ModalHeader
            name="navigation-menu"
            title={title}
            onClose={pop}
            submitButtonProps={{
              disabled: !isDirty || !isValid,
              onClick: submit,
            }}
          />
        }
      >
        <div className={styles.columns}>
          <div className={styles.column}>
            <Paper>
              <div className={styles.fields}>
                <div>
                  <label className={styles.label} htmlFor="navigation-title">
                    Title *
                  </label>
                  <Controller
                    name="title"
                    control={control}
                    rules={{ required: "Title is required" }}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="navigation-title"
                        data-testid="title-input"
                        placeholder="Title"
                        maxLength={255}
                        showCount
                        status={errors.title ? "error" : undefined}
                      />
                    )}
                  />
                  {errors.title ? <div className={styles.error}>{errors.title.message}</div> : null}
                </div>
                <div>
                  <label className={styles.label} htmlFor="navigation-slug">
                    Slug *
                  </label>
                  <Controller
                    name="slug"
                    control={control}
                    rules={{ required: "Slug is required" }}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="navigation-slug"
                        data-testid="slug-input"
                        placeholder="menu-slug"
                        status={errors.slug ? "error" : undefined}
                      />
                    )}
                  />
                  {errors.slug ? <div className={styles.error}>{errors.slug.message}</div> : null}
                </div>
              </div>
            </Paper>

            <Paper>
              <PaperHeader
                title="Menu items"
                actions={
                  <Button
                    data-testid="add-link-button"
                    icon={<PlusOutlined />}
                    onClick={openCreateLink}
                  />
                }
              />
              <div className={styles.treeViewport}>
                <SortableTree
                  value={items}
                  onChange={setItems}
                  onEdit={openEditLink}
                  onRemove={(id) => setItems(removeItem(items, id))}
                />
              </div>
            </Paper>
          </div>

          <div className={styles.column}>
            <Paper>
              <PaperHeader title="Information" />
              <label className={styles.label} htmlFor="navigation-status">
                Status *
              </label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    id="navigation-status"
                    options={statusOptions}
                    style={{ width: "100%" }}
                  />
                )}
              />
              <div className={styles.infoRow}>
                <Typography.Text strong>Created at</Typography.Text>
                <Typography.Text>{formatDate(menu.createdAt)}</Typography.Text>
              </div>
              <div className={styles.infoRow}>
                <Typography.Text strong>Updated at</Typography.Text>
                <Typography.Text>{formatDate(menu.updatedAt)}</Typography.Text>
              </div>
            </Paper>
          </div>
        </div>
      </ModalLayout>
    </FormProvider>
  );
}
