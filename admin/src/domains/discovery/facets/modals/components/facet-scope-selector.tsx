"use client";

import { Checkbox, Flex } from "antd";
import { createStyles } from "antd-style";
import { FacetScopeType } from "@/graphql/types";
import { FACET_UI_MAPPINGS } from "../../mappers";

const useStyles = createStyles(({ token }) => ({
  options: {
    width: "100%",
  },
  option: {
    flex: 1,
    minWidth: 0,
    padding: 12,
    border: `1px solid ${token.colorBorder}`,
    borderRadius: token.borderRadius,
  },
  optionContent: {
    display: "inline-flex",
    flexDirection: "column",
    gap: 2,
    verticalAlign: "top",
  },
  optionLabel: {
    color: token.colorText,
    fontWeight: 500,
  },
  optionDescription: {
    color: token.colorTextSecondary,
    fontSize: 12,
    lineHeight: 1.4,
  },
}));

const SCOPE_OPTIONS = [
  {
    value: FacetScopeType.Search,
    ...FACET_UI_MAPPINGS.scopes[FacetScopeType.Search],
  },
  {
    value: FacetScopeType.Category,
    ...FACET_UI_MAPPINGS.scopes[FacetScopeType.Category],
  },
] as const;

interface FacetScopeSelectorProps {
  value: FacetScopeType[];
  onChange: (value: FacetScopeType[]) => void;
}

export function FacetScopeSelector({
  value,
  onChange,
}: FacetScopeSelectorProps) {
  const { styles } = useStyles();

  return (
    <Checkbox.Group
      value={value}
      className={styles.options}
      onChange={(nextValue) => onChange(nextValue as FacetScopeType[])}
    >
      <Flex gap={8} className={styles.options}>
        {SCOPE_OPTIONS.map((option) => (
          <Checkbox
            key={option.value}
            value={option.value}
            className={styles.option}
            data-testid={`facet-scope-${option.value.toLowerCase()}-checkbox`}
          >
            <span className={styles.optionContent}>
              <span className={styles.optionLabel}>{option.label}</span>
              <span className={styles.optionDescription}>
                {option.description}
              </span>
            </span>
          </Checkbox>
        ))}
      </Flex>
    </Checkbox.Group>
  );
}
