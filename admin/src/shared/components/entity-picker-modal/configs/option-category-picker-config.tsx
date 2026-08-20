"use client";

import { createElement, useMemo, useState } from "react";
import { App, Button, Flex, Input, Modal, Typography } from "antd";
import { slugify } from "transliteration/dist/node/src/node/index.js";
import type { ColDef } from "ag-grid-community";
import { LuTags as TagsOutlined } from "react-icons/lu";
import {
  useCreateProductOptionCategory,
  useProductOptionCategories,
} from "@/domains/inventory/products/hooks";
import {
  ProductOptionCategoryOrderField,
  type ApiProductOptionCategory,
  type ApiProductOptionCategoryOrderByInput,
  type ApiProductOptionCategoryWhereInput,
} from "@/graphql/types";
import { EntityCellRenderer } from "../cell-renderers";
import { registerEntityPickerConfig } from ".";
import type { IEntityPickerConfig, IEntityPickerDataResult, IPickableEntity } from "../types";

export interface OptionCategoryPickerEntity extends IPickableEntity {
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

function toSlug(value: string) {
  return slugify(value)
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function OptionCategoryPickerHeaderExtra() {
  const { message } = App.useApp();
  const { createCategory, loading } = useCreateProductOptionCategory();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  const close = () => {
    setOpen(false);
    setName("");
    setSlug("");
    setSlugEdited(false);
  };

  const submit = async () => {
    const result = await createCategory({ name: name.trim(), slug: slug.trim() });
    if (result.userErrors.length) {
      void message.error(result.userErrors[0]?.message ?? "Could not create category");
      return;
    }
    void message.success("Option category created");
    close();
  };

  return (
    <>
      <Button size="small" onClick={() => setOpen(true)}>
        New category
      </Button>
      <Modal
        title="New option category"
        open={open}
        onCancel={close}
        onOk={() => void submit()}
        okButtonProps={{ disabled: !name.trim() || !slug.trim(), loading }}
        destroyOnHidden
      >
        <Flex vertical gap={12}>
          <label>
            <Typography.Text>Name</Typography.Text>
            <Input
              value={name}
              onChange={(event) => {
                const value = event.target.value;
                setName(value);
                if (!slugEdited) setSlug(toSlug(value));
              }}
              autoFocus
            />
          </label>
          <label>
            <Typography.Text>Slug</Typography.Text>
            <Input
              value={slug}
              onChange={(event) => {
                setSlugEdited(true);
                setSlug(toSlug(event.target.value));
              }}
            />
          </label>
        </Flex>
      </Modal>
    </>
  );
}

function transformCategory(category: ApiProductOptionCategory): OptionCategoryPickerEntity {
  return {
    id: category.id,
    title: category.name,
    name: category.name,
    slug: category.slug,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

function useOptionCategoryPickerData(options: {
  pageSize: number;
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
  where?: object | null;
  orderBy?: object[] | null;
  excludeIds: string[];
}): IEntityPickerDataResult<OptionCategoryPickerEntity> {
  const where = useMemo<ApiProductOptionCategoryWhereInput | null>(() => {
    const conditions: ApiProductOptionCategoryWhereInput[] = [];
    if (options.where) {
      conditions.push(options.where as ApiProductOptionCategoryWhereInput);
    }
    if (options.excludeIds.length) {
      conditions.push({ id: { _notIn: options.excludeIds } });
    }
    if (!conditions.length) return null;
    return conditions.length === 1 ? conditions[0] : { _and: conditions };
  }, [options.excludeIds, options.where]);

  const { categories, totalCount, pageInfo, loading, error } = useProductOptionCategories({
    first: options.first,
    after: options.after,
    last: options.last,
    before: options.before,
    where,
    orderBy: options.orderBy as ApiProductOptionCategoryOrderByInput[] | null,
    fetchPolicy: "network-only",
  });

  return {
    data: categories.map(transformCategory),
    isLoading: loading,
    error,
    pagination: {
      total: totalCount,
      pageSize: options.pageSize,
      hasNext: pageInfo?.hasNextPage ?? false,
      hasPrev: pageInfo?.hasPreviousPage ?? false,
      startCursor: pageInfo?.startCursor ?? null,
      endCursor: pageInfo?.endCursor ?? null,
    },
  };
}

const columns: ColDef<OptionCategoryPickerEntity>[] = [
  {
    headerName: "Option category",
    field: "title",
    cellRenderer: EntityCellRenderer,
    cellRendererParams: { fallbackIcon: createElement(TagsOutlined) },
    flex: 1,
    minWidth: 240,
  },
  { headerName: "Slug", field: "slug", minWidth: 180 },
];

export const optionCategoryPickerConfig: IEntityPickerConfig<
  OptionCategoryPickerEntity,
  ApiProductOptionCategoryWhereInput,
  ProductOptionCategoryOrderField
> = {
  entityType: "option-category",
  entityName: "Option category",
  entityNamePlural: "Option categories",
  filterSchema: [],
  searchEnabled: true,
  columns,
  pageConfig: {
    storageKey: "option-category-picker-grid-state",
    defaultPageSize: 20,
    sortFieldMapping: {
      title: ProductOptionCategoryOrderField.Name,
      slug: ProductOptionCategoryOrderField.Slug,
    },
    buildSearchCondition: (search) => ({ name: { _containsi: search } }),
  },
  useData: useOptionCategoryPickerData,
  getRowId: (entity) => entity.id,
  HeaderExtra: OptionCategoryPickerHeaderExtra,
};

registerEntityPickerConfig(optionCategoryPickerConfig);
