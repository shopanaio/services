"use client";

import { useCallback, useMemo, useState } from "react";
import { Alert, Button, Collapse, Flex, Spin, Tag, Typography } from "antd";
import { FilterOutlined } from "@ant-design/icons";
import { ModalLayout, useModalStackContext } from "@/layouts/modals";
import {
  ListingSortBy,
  ListingSortDirection,
  ProductSortBy,
  SortDirection,
  type ApiCategory,
  type ApiListingFacet,
  type ApiListingFacetValue,
  type ApiListingOrderByInput,
  type ApiListingProductFilter,
} from "@/graphql/types";
import { useCategoryListingPreview } from "../../hooks";
import type { ICategoryListingPreviewModalPayload } from "../../modals";
import { ListingPreviewFacets, stableSerialize, toFacetInput } from "./listing-preview-facets";
import { ListingPreviewGrid } from "./listing-preview-grid";
import { useListingPreviewStyles } from "./listing-preview-modal.styles";
import { ListingPreviewPagination } from "./listing-preview-pagination";
import { ListingPreviewSort } from "./listing-preview-sort";
import type { ListingPreviewState } from "./types";

const DEFAULT_PAGE_SIZE = 24;

const mapCategorySort = (category: ApiCategory): ApiListingOrderByInput => {
  switch (category.defaultSort) {
    case ProductSortBy.Name:
      return {
        by: ListingSortBy.Name,
        direction:
          category.defaultSortDirection === SortDirection.Desc
            ? ListingSortDirection.Desc
            : ListingSortDirection.Asc,
      };
    case ProductSortBy.Newest:
      return {
        by: ListingSortBy.Newest,
        direction:
          category.defaultSortDirection === SortDirection.Asc
            ? ListingSortDirection.Asc
            : ListingSortDirection.Desc,
      };
    case ProductSortBy.Price:
      return {
        by: ListingSortBy.Price,
        direction:
          category.defaultSortDirection === SortDirection.Desc
            ? ListingSortDirection.Desc
            : ListingSortDirection.Asc,
      };
    case ProductSortBy.Manual:
    default:
      return {
        by: ListingSortBy.Newest,
        direction: ListingSortDirection.Desc,
      };
  }
};

const getCategoryPath = (category: ApiCategory) => {
  const names = [...category.ancestors, category].map((item) => item.name);
  return names.join(" / ");
};

const getSelectedFacetLabels = (facets: ApiListingFacet[]) =>
  facets.flatMap((facet) =>
    facet.values
      .filter((value) => value.selected)
      .map((value) => ({
        key: `${facet.id}:${value.id}`,
        label: `${facet.label}: ${value.label}`,
        facet,
        value,
      })),
  );

const inputMatchesFacetValue = (
  input: ApiListingProductFilter,
  value: ApiListingFacetValue,
) => {
  const valueInput = toFacetInput(value);
  return valueInput ? stableSerialize(input) === stableSerialize(valueInput) : false;
};

export const ListingPreviewModal = () => {
  const { payload, forcePop } = useModalStackContext();
  const { category } = payload as ICategoryListingPreviewModalPayload;
  const { styles } = useListingPreviewStyles();
  const [state, setState] = useState<ListingPreviewState>(() => ({
    selectedFacetInputs: [],
    orderBy: mapCategorySort(category),
    after: null,
    cursorStack: [],
  }));

  const { items, facets, totalCount, pageInfo, loading, error, refetch } =
    useCategoryListingPreview(category.id, {
      first: DEFAULT_PAGE_SIZE,
      after: state.after,
      facets: state.selectedFacetInputs,
      orderBy: state.orderBy,
    });

  const selectedFacetLabels = useMemo(() => getSelectedFacetLabels(facets), [facets]);
  const hasInitialData = items.length > 0 || facets.length > 0;
  const pageIndex = state.cursorStack.length + 1;

  const resetCursor = useCallback(
    (nextState: Partial<ListingPreviewState>) => {
      setState((current) => ({
        ...current,
        ...nextState,
        after: null,
        cursorStack: [],
      }));
    },
    [],
  );

  const removeFacetInput = useCallback((inputToRemove: ApiListingProductFilter) => {
    resetCursor({
      selectedFacetInputs: state.selectedFacetInputs.filter(
        (input) => stableSerialize(input) !== stableSerialize(inputToRemove),
      ),
    });
  }, [resetCursor, state.selectedFacetInputs]);

  const toggleFacetValue = useCallback(
    (facet: ApiListingFacet, value: ApiListingFacetValue) => {
      const input = toFacetInput(value);
      if (!input) {
        return;
      }

      const inputKey = stableSerialize(input);
      const facetInputKeys = new Set(
        facet.values
          .map(toFacetInput)
          .filter((facetInput): facetInput is ApiListingProductFilter => !!facetInput)
          .map(stableSerialize),
      );
      const isSelected = state.selectedFacetInputs.some(
        (selectedInput) => stableSerialize(selectedInput) === inputKey,
      );
      const withoutCurrentFacet = state.selectedFacetInputs.filter(
        (selectedInput) => !facetInputKeys.has(stableSerialize(selectedInput)),
      );
      const withoutValue = state.selectedFacetInputs.filter(
        (selectedInput) => stableSerialize(selectedInput) !== inputKey,
      );

      resetCursor({
        selectedFacetInputs: isSelected
          ? withoutValue
          : facet.uiType === "RADIO"
            ? [...withoutCurrentFacet, input]
            : [...state.selectedFacetInputs, input],
      });
    },
    [resetCursor, state.selectedFacetInputs],
  );

  const setRange = useCallback(
    (
      facet: ApiListingFacet,
      value: ApiListingFacetValue,
      field: "min" | "max",
      amount: number | null,
    ) => {
      const input = toFacetInput(value);
      if (!input?.price) {
        return;
      }

      const nextInput: ApiListingProductFilter = {
        ...input,
        price: {
          ...input.price,
          [field]: amount === null ? null : String(amount),
        },
      };
      const facetInputKeys = new Set(
        facet.values
          .map(toFacetInput)
          .filter((facetInput): facetInput is ApiListingProductFilter => !!facetInput)
          .map(stableSerialize),
      );

      resetCursor({
        selectedFacetInputs: [
          ...state.selectedFacetInputs.filter(
            (selectedInput) => !facetInputKeys.has(stableSerialize(selectedInput)),
          ),
          nextInput,
        ],
      });
    },
    [resetCursor, state.selectedFacetInputs],
  );

  const handleSortChange = useCallback(
    (orderBy: ApiListingOrderByInput) => resetCursor({ orderBy }),
    [resetCursor],
  );

  const handleNext = useCallback(() => {
    if (!pageInfo?.hasNextPage || !pageInfo.endCursor) {
      return;
    }

    setState((current) => ({
      ...current,
      after: pageInfo.endCursor ?? null,
      cursorStack: [...current.cursorStack, current.after ?? ""],
    }));
  }, [pageInfo?.endCursor, pageInfo?.hasNextPage]);

  const handlePrevious = useCallback(() => {
    setState((current) => {
      const nextStack = current.cursorStack.slice(0, -1);
      const previousAfter = current.cursorStack[current.cursorStack.length - 1] ?? null;

      return {
        ...current,
        after: previousAfter || null,
        cursorStack: nextStack,
      };
    });
  }, []);

  const clearFilters = useCallback(() => {
    resetCursor({ selectedFacetInputs: [] });
  }, [resetCursor]);

  const facetsContent = (
    <ListingPreviewFacets
      facets={facets}
      selectedInputs={state.selectedFacetInputs}
      onToggleValue={toggleFacetValue}
      onSetRange={setRange}
      onClearAll={clearFilters}
    />
  );

  return (
    <ModalLayout
      name="category-listing-preview"
      fullWidth
      bodyClassName={styles.modalBody}
      headerProps={{
        title: `Listing preview: ${category.name}`,
        onClose: forcePop,
        submitButtonProps: null,
      }}
    >
      <div className={styles.root}>
        {error && (
          <Alert
            type="error"
            showIcon
            message={error.message}
            action={<Button onClick={() => void refetch()}>Retry</Button>}
          />
        )}

        <div className={styles.previewHeader}>
          <div>
            <div className={styles.categoryPath}>{getCategoryPath(category)}</div>
            <Typography.Title level={2} className={styles.categoryTitle}>
              {category.name}
            </Typography.Title>
            <Typography.Text
              type="secondary"
              data-testid="category-listing-preview-total-count"
            >
              {totalCount} products
            </Typography.Text>
          </div>
          <div className={styles.toolbar}>
            <Button
              icon={<FilterOutlined />}
              className={styles.mobileFilters}
              aria-label="Open filters"
            >
              Filters {state.selectedFacetInputs.length}
            </Button>
            <ListingPreviewSort value={state.orderBy} onChange={handleSortChange} />
            {loading && hasInitialData && <Spin size="small" />}
          </div>
        </div>

        <div className={styles.selectedFilters}>
          {selectedFacetLabels.map(({ key, label, value }) => (
            <Tag
              key={key}
              closable
              onClose={(event) => {
                event.preventDefault();
                const input = toFacetInput(value);
                if (input) {
                  removeFacetInput(input);
                }
              }}
            >
              {label}
            </Tag>
          ))}
          {selectedFacetLabels.length > 0 && (
            <Button
              size="small"
              type="link"
              onClick={clearFilters}
              data-testid="category-listing-preview-clear-filters"
            >
              Clear all
            </Button>
          )}
        </div>

        <div className={styles.content}>
          <aside className={styles.desktopFacets}>{facetsContent}</aside>
          <div className={styles.productPane}>
            <div className={styles.mobileFilters}>
              <Collapse
                size="small"
                items={[
                  {
                    key: "filters",
                    label: `Filters ${state.selectedFacetInputs.length}`,
                    children: facetsContent,
                  },
                ]}
              />
            </div>
            <div className={styles.resultBar}>
              <Typography.Text type="secondary">
                Page {pageIndex} · {items.length} of {totalCount} loaded
              </Typography.Text>
            </div>
            <ListingPreviewGrid
              items={items}
              loading={loading}
              hasInitialData={hasInitialData}
            />
            <ListingPreviewPagination
              pageInfo={pageInfo}
              pageIndex={pageIndex}
              loadedCount={items.length}
              totalCount={totalCount}
              loading={loading}
              onNext={handleNext}
              onPrevious={handlePrevious}
            />
          </div>
        </div>
      </div>
    </ModalLayout>
  );
};
