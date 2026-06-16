"use client";

import { Typography, Tag, Flex } from "antd";
import { PictureOutlined } from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EditAction } from "../../edit-action";
import { useOptionsStyles } from "../product-details-card.styles";
import { DISPLAY_TYPE_OPTIONS } from "../../../modals/edit-options-modal/edit-options-modal.constants";
import { OptionDisplayType, SwatchType, type ApiProductOption, type ApiProductOptionSwatch } from "@/graphql/types";

interface IOptionsSectionProps {
  options: ApiProductOption[];
  onEdit: () => void;
}

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

export const OptionsSection = ({ options, onEdit }: IOptionsSectionProps) => {
  const { styles } = useOptionsStyles();

  if (!options || options.length === 0) {
    return null;
  }

  return (
    <Paper>
      <PaperHeader
        title="Options"
        actions={<EditAction onEdit={onEdit} label="Edit options" />}
      />
      <Flex vertical gap={12}>
        {options.map((option) => {
          const displayTypeOption = DISPLAY_TYPE_OPTIONS.find((s) => s.key === option.displayType);
          const showSwatch = option.displayType === OptionDisplayType.Swatch;

          return (
            <div key={option.id} className={styles.optionGroup}>
              <Flex align="center" gap={4} className={styles.optionHeader}>
                {displayTypeOption && displayTypeOption.icon}
                <Typography.Text strong className={styles.optionTitle}>
                  {option.name}
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
        })}
      </Flex>
    </Paper>
  );
};
