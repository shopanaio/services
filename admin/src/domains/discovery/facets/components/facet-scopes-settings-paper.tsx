"use client";

import { Alert, Flex, Skeleton, Tag, Typography } from "antd";
import { LuChevronRight as RightOutlined } from "react-icons/lu";
import { createStyles } from "antd-style";
import { FacetScopeType, FacetType } from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useFacets } from "../hooks";
import {
  FACET_UI_MAPPINGS,
  getFacetScopeLabel,
  getFacetTypeIcon,
} from "../mappers";
import { useFacetScopePickerModal } from "../modals";

const FACET_TYPE_ORDER = [
  FacetType.Price,
  FacetType.Tag,
  FacetType.Feature,
  FacetType.Option,
  FacetType.InStock,
] as const;

const SCOPE_ORDER = [FacetScopeType.Search, FacetScopeType.Category] as const;

const SINGLETON_FACET_TYPES = new Set<FacetType>([
  FacetType.Price,
  FacetType.Tag,
  FacetType.InStock,
]);

const useStyles = createStyles(({ token }) => ({
  description: {
    display: "block",
    marginTop: -token.marginXS,
    marginBottom: token.margin,
  },
  rows: {
    display: "flex",
    flexDirection: "column",
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    overflow: "hidden",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "minmax(150px, 0.55fr) minmax(0, 1fr) auto",
    gap: token.padding,
    alignItems: "center",
    width: "100%",
    minHeight: 66,
    padding: `${token.paddingSM}px ${token.padding}px`,
    border: 0,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    color: "inherit",
    textAlign: "left",
    cursor: "pointer",
    transition: "background 0.2s",
    "&:last-child": {
      borderBottom: 0,
    },
    "&:hover": {
      background: token.colorFillQuaternary,
    },
    "&:focus-visible": {
      outline: `2px solid ${token.colorPrimary}`,
      outlineOffset: -2,
    },
    "@media (max-width: 760px)": {
      gridTemplateColumns: "minmax(0, 1fr) auto",
    },
  },
  summary: {
    minWidth: 0,
    "@media (max-width: 760px)": {
      gridColumn: "1 / -1",
      gridRow: 2,
    },
  },
  metric: {
    marginInlineEnd: 0,
    minHeight: 26,
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    "& svg": {
      display: "block",
    },
  },
  chevron: {
    color: token.colorTextTertiary,
  },
}));

export function FacetScopesSettingsPaper() {
  const { styles } = useStyles();
  const { facets, loading, error } = useFacets();
  const { push: openFacetScopePicker } = useFacetScopePickerModal();

  return (
    <Paper
      aria-label="Filters settings section"
      data-testid="discovery-filters-settings-section"
    >
      <PaperHeader title="Filters" />
      <Typography.Text type="secondary" className={styles.description}>
        Choose which facets are available in each storefront listing context.
      </Typography.Text>

      {error ? (
        <Alert
          type="error"
          showIcon
          message="Facet contexts could not be loaded."
          description={error.message}
        />
      ) : loading && facets.length === 0 ? (
        <Skeleton active title={false} paragraph={{ rows: 2 }} />
      ) : (
        <div className={styles.rows}>
          {SCOPE_ORDER.map((scope) => (
            <button
              key={scope}
              type="button"
              className={styles.row}
              onClick={() => openFacetScopePicker({ scope, facets })}
              data-testid={`discovery-filters-${scope.toLowerCase()}-row`}
            >
              <Flex vertical gap={2}>
                <Typography.Text strong>
                  {getFacetScopeLabel(scope)} context
                </Typography.Text>
                <Typography.Text type="secondary">
                  {facets.filter((facet) => facet.scopes.includes(scope)).length}{" "}
                  facets
                </Typography.Text>
              </Flex>

              <Flex gap={6} wrap className={styles.summary}>
                {FACET_TYPE_ORDER.map((facetType) => {
                  const mapping = FACET_UI_MAPPINGS.facetTypes[facetType];
                  const count = facets.filter(
                    (facet) =>
                      facet.facetType === facetType &&
                      facet.scopes.includes(scope),
                  ).length;
                  const isSingleton = SINGLETON_FACET_TYPES.has(facetType);

                  return (
                    <Tag
                      key={facetType}
                      color={count > 0 ? "blue" : undefined}
                      className={styles.metric}
                    >
                      {getFacetTypeIcon(facetType)}
                      <span>{mapping.shortLabel}</span>
                      {!isSingleton ? <strong>{count}</strong> : null}
                    </Tag>
                  );
                })}
              </Flex>

              <RightOutlined className={styles.chevron} />
            </button>
          ))}
        </div>
      )}
    </Paper>
  );
}
