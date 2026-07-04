"use client";

import { Button, Checkbox, Flex, InputNumber, Radio, Select, Switch, Typography } from "antd";
import type {
  ApiListingFacet,
  ApiListingFacetValue,
  ApiListingProductFilter,
} from "@/graphql/types";
import { FacetUiType } from "@/graphql/types";
import { useListingPreviewStyles } from "./listing-preview-modal.styles";

export const stableSerialize = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nestedValue]) => `${JSON.stringify(key)}:${stableSerialize(nestedValue)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
};

export const toFacetInput = (
  value: ApiListingFacetValue,
): ApiListingProductFilter | null => {
  if (!value.input || typeof value.input !== "object" || Array.isArray(value.input)) {
    return null;
  }

  return value.input as ApiListingProductFilter;
};

interface ListingPreviewFacetsProps {
  facets: ApiListingFacet[];
  selectedInputs: ApiListingProductFilter[];
  onToggleValue: (facet: ApiListingFacet, value: ApiListingFacetValue) => void;
  onSetRange: (
    facet: ApiListingFacet,
    currentValue: ApiListingFacetValue,
    field: "min" | "max",
    amount: number | null,
  ) => void;
  onClearAll: () => void;
}

export const ListingPreviewFacets = ({
  facets,
  selectedInputs,
  onToggleValue,
  onSetRange,
  onClearAll,
}: ListingPreviewFacetsProps) => {
  const { styles } = useListingPreviewStyles();
  const hasSelected = selectedInputs.length > 0;

  if (facets.length === 0) {
    return <Typography.Text type="secondary">No filters available</Typography.Text>;
  }

  return (
    <Flex vertical>
      <Flex align="center" justify="space-between" style={{ marginBottom: 12 }}>
        <Typography.Text strong>Filters</Typography.Text>
        {hasSelected && (
          <Button
            size="small"
            type="link"
            onClick={onClearAll}
            data-testid="category-listing-preview-clear-filters"
          >
            Clear all
          </Button>
        )}
      </Flex>

      {facets.map((facet) => (
        <div
          key={facet.id}
          className={styles.facetGroup}
          data-testid={`category-listing-preview-facet-${facet.id}`}
        >
          <Typography.Text strong>{facet.label}</Typography.Text>
          <Flex vertical gap={6} style={{ marginTop: 8 }}>
            {facet.uiType === FacetUiType.Dropdown ? (
              <Select
                allowClear
                placeholder={facet.label}
                value={facet.values.find((value) => value.selected)?.id}
                options={facet.values.map((value) => ({
                  value: value.id,
                  label: `${value.label} (${value.count})`,
                  disabled: value.count === 0 && !value.selected,
                }))}
                onChange={(valueId) => {
                  const value = facet.values.find((item) => item.id === valueId);
                  if (value) {
                    onToggleValue(facet, value);
                  }
                }}
              />
            ) : facet.uiType === FacetUiType.Range ? (
              <Flex vertical gap={8}>
                {facet.values.map((value) => {
                  const input = toFacetInput(value);
                  const min = input?.price?.min ? Number(input.price.min) : null;
                  const max = input?.price?.max ? Number(input.price.max) : null;

                  return (
                    <div
                      key={value.id}
                      data-testid={`category-listing-preview-facet-value-${value.id}`}
                    >
                      <Typography.Text type="secondary">
                        {value.label} ({value.count})
                      </Typography.Text>
                      <div className={styles.rangeRow}>
                        <InputNumber
                          placeholder="Min"
                          min={0}
                          value={min}
                          onChange={(amount) =>
                            onSetRange(facet, value, "min", amount)
                          }
                        />
                        <InputNumber
                          placeholder="Max"
                          min={0}
                          value={max}
                          onChange={(amount) =>
                            onSetRange(facet, value, "max", amount)
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </Flex>
            ) : (
              facet.values.map((value) => {
                const disabled = value.count === 0 && !value.selected;
                const label = `${facet.label}: ${value.label}, ${value.count} products`;

                return (
                  <label
                    key={value.id}
                    className={styles.facetValue}
                    data-testid={`category-listing-preview-facet-value-${value.id}`}
                  >
                    {facet.uiType === FacetUiType.Boolean ? (
                      <Switch
                        size="small"
                        checked={value.selected}
                        disabled={disabled}
                        aria-label={label}
                        onChange={() => onToggleValue(facet, value)}
                      />
                    ) : facet.uiType === FacetUiType.Radio ? (
                      <Radio
                        checked={value.selected}
                        disabled={disabled}
                        aria-label={label}
                        onChange={() => onToggleValue(facet, value)}
                      >
                        {value.label}
                      </Radio>
                    ) : (
                      <Checkbox
                        checked={value.selected}
                        disabled={disabled}
                        aria-label={label}
                        onChange={() => onToggleValue(facet, value)}
                      >
                        {value.label}
                      </Checkbox>
                    )}
                    <Typography.Text type="secondary">{value.count}</Typography.Text>
                  </label>
                );
              })
            )}
          </Flex>
        </div>
      ))}
    </Flex>
  );
};
