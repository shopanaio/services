"use client";

import { useMemo, useState } from "react";
import { Alert, App, Flex, Input, Radio, Skeleton, Typography } from "antd";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { ApiCategory } from "@/graphql/types";
import { useCategories, useUpdateCategory } from "../../hooks";
import { getCategoryRoutePath } from "../../utils/category-route-path";
import {
  mapCategoryHierarchyToUpdateInput,
  mapCategoryUserErrorsToFormErrors,
  type CategoryHierarchyFormValues,
} from "../../mappers";
import type { ICategoryEditHierarchyModalPayload } from "../../modals";

function isCategoryDescendant(candidate: ApiCategory, category: ApiCategory) {
  const categoryPath = category.path || category.handle;
  return (
    candidate.id === category.id ||
    candidate.path === categoryPath ||
    candidate.path.startsWith(`${categoryPath}/`)
  );
}

export const EditCategoryHierarchyModal = () => {
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as ICategoryEditHierarchyModalPayload;
  const { category, onSaved } = typedPayload;
  const { updateCategory, loading: isSubmitting } = useUpdateCategory();
  const { categories, loading, error } = useCategories({ first: 250 });
  const [query, setQuery] = useState("");
  const [parentId, setParentId] = useState<string | null>(
    category.parent?.id ?? null,
  );
  const [fieldError, setFieldError] = useState<string | null>(null);

  const candidates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return categories
      .filter((candidate) => !isCategoryDescendant(candidate, category))
      .filter((candidate) => {
        if (!normalizedQuery) return true;
        return `${candidate.name} ${candidate.handle} ${getCategoryRoutePath(candidate)}`
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((a, b) => a.path.localeCompare(b.path));
  }, [categories, category, query]);

  const onSubmit = async () => {
    const values: CategoryHierarchyFormValues = { parentId };
    const result = await updateCategory(
      category.id,
      mapCategoryHierarchyToUpdateInput(values),
      category.revision,
    );

    if (result.errors.length > 0) {
      const parentError = mapCategoryUserErrorsToFormErrors(
        result.errors,
      ).find((errorItem) => errorItem.field === "parentId");
      setFieldError(parentError?.message ?? null);
      message.error(result.errors[0].message);
      return;
    }

    message.success("Category hierarchy updated");
    await onSaved?.();
    pop();
  };

  return (
    <ModalLayout
      name="edit-category-hierarchy"
      header={
        <ModalHeader
          name="edit-category-hierarchy"
          title="Move category"
          onClose={pop}
          submitButtonProps={{
            children: "Move category",
            onClick: onSubmit,
            loading: isSubmitting,
          }}
        />
      }
    >
      <Paper>
        <PaperHeader title="Current path" />
        <Typography.Text>{getCategoryRoutePath(category)}</Typography.Text>
      </Paper>

      <Paper>
        <PaperHeader title="New parent" />
        <Flex vertical gap={12}>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search categories..."
            allowClear
            data-testid="edit-category-hierarchy-search-input"
          />

          {error && <Alert type="error" message={error.message} showIcon />}
          {fieldError && <Alert type="error" message={fieldError} showIcon />}

          {loading ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : (
            <Radio.Group
              value={parentId}
              onChange={(event) => {
                setParentId(event.target.value);
                setFieldError(null);
              }}
              style={{ width: "100%" }}
              data-testid="edit-category-hierarchy-parent-radio-group"
            >
              <Flex vertical gap={8}>
                <Radio value={null}>Root</Radio>
                {candidates.map((candidate) => (
                  <Radio key={candidate.id} value={candidate.id}>
                    <span style={{ paddingLeft: candidate.depth * 12 }}>
                      {candidate.name}
                    </span>
                    <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                      {getCategoryRoutePath(candidate)}
                    </Typography.Text>
                  </Radio>
                ))}
              </Flex>
            </Radio.Group>
          )}
        </Flex>
      </Paper>
    </ModalLayout>
  );
};
