"use client";

import type { ReactNode } from "react";
import { Typography, Tag, Flex } from "antd";
import {
  BgColorsOutlined,
  CheckCircleOutlined,
  MenuOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EntityDetailsEmptyState } from "@/domains/inventory/components/entity-details-sections";
import { useOptionsStyles } from "../product-details-card.styles";
import { OptionDisplayType, SwatchType, type ApiProductOption, type ApiProductOptionSwatch } from "@/graphql/types";

interface IOptionsSectionProps {
  options: ApiProductOption[];
  actions?: ReactNode;
}

const DISPLAY_TYPE_METADATA: Record<
  OptionDisplayType,
  { label: string; icon: ReactNode }
> = {
  [OptionDisplayType.Swatch]: {
    label: "Swatch",
    icon: <BgColorsOutlined />,
  },
  [OptionDisplayType.Buttons]: {
    label: "Buttons",
    icon: <CheckCircleOutlined />,
  },
  [OptionDisplayType.Dropdown]: {
    label: "Dropdown",
    icon: <MenuOutlined />,
  },
};

const SwatchPreview = ({
  swatch,
}: {
  swatch: ApiProductOptionSwatch | null | undefined;
}) => {
  const { styles } = useOptionsStyles();

  if (!swatch) return null;

  if (swatch.swatchType === SwatchType.Color) {
    return (
      <span
        className={styles.swatchPreview}
        style={{ background: swatch.colorOne ?? undefined }}
      />
    );
  }

  if (swatch.swatchType === SwatchType.Gradient) {
    return (
      <span
        className={styles.swatchPreview}
        style={{
          background: `linear-gradient(90deg, ${swatch.colorOne} 49.9%, ${swatch.colorTwo} 50%, ${swatch.colorTwo} 100%)`,
        }}
      />
    );
  }

  if (swatch.swatchType === SwatchType.Image && swatch.file?.url) {
    return (
      <span className={styles.swatchPreview}>
        <img src={swatch.file.url} alt="" className={styles.swatchPreviewImg} />
      </span>
    );
  }

  if (swatch.swatchType === SwatchType.Image) {
    return (
      <span className={styles.swatchPreviewPlaceholder}>
        <PictureOutlined />
      </span>
    );
  }

  return null;
};

export const OptionsSection = ({ options, actions }: IOptionsSectionProps) => {
  const { styles } = useOptionsStyles();

  if ((!options || options.length === 0) && !actions) {
    return null;
  }

  return (
    <Paper data-testid="product-options-section">
      <PaperHeader title="Options" actions={actions} />
      <Flex vertical gap={12}>
        {options.length > 0 ? (
          options.map((option) => {
            const displayTypeOption = DISPLAY_TYPE_METADATA[option.displayType];
            const showSwatch = option.displayType === OptionDisplayType.Swatch;

            return (
              <div key={option.id} className={styles.optionGroup}>
                <Flex align="center" gap={6} className={styles.optionHeader}>
                  {displayTypeOption.icon}
                  <Typography.Text strong className={styles.optionTitle}>
                    {option.name}
                  </Typography.Text>
                  <Typography.Text type="secondary" className={styles.styleTag}>
                    {displayTypeOption.label}
                  </Typography.Text>
                </Flex>
                <Flex gap={4} wrap="wrap">
                  {option.values?.map((value) => (
                    <Tag
                      key={value.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                      icon={
                        showSwatch ? (
                          <SwatchPreview swatch={value.swatch} />
                        ) : null
                      }
                    >
                      {value.name}
                    </Tag>
                  ))}
                </Flex>
              </div>
            );
          })
        ) : (
          <div data-testid="product-options-empty-state">
            <EntityDetailsEmptyState
              icon={<MenuOutlined />}
              state={{
                title: "No options added",
                description:
                  "Add product options to define selectable values like size, color, or material.",
              }}
            />
          </div>
        )}
      </Flex>
    </Paper>
  );
};
