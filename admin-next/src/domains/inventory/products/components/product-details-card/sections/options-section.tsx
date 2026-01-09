"use client";

import { Typography, Tag, Flex } from "antd";
import { PictureOutlined } from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EditAction } from "../../edit-action";
import { useOptionsStyles } from "../product-details-card.styles";
import type { IOptionGroup } from "../../../modals/edit-options-modal/edit-options-modal.schema";
import { STYLE_OPTIONS } from "../../../modals/edit-options-modal/edit-options-modal.constants";

interface IOptionsSectionProps {
  options: IOptionGroup[];
  onEdit: () => void;
}

const SwatchPreview = ({
  swatch,
}: {
  swatch: IOptionGroup["values"][0]["swatch"];
}) => {
  const { styles } = useOptionsStyles();

  if (!swatch) return null;

  if (swatch.type === "color") {
    return (
      <span
        className={styles.swatchPreview}
        style={{ background: swatch.color1 }}
      />
    );
  }

  if (swatch.type === "color_duo") {
    return (
      <span
        className={styles.swatchPreview}
        style={{
          background: `linear-gradient(90deg, ${swatch.color1} 49.9%, ${swatch.color2} 50%, ${swatch.color2} 100%)`,
        }}
      />
    );
  }

  if (swatch.type === "image" && swatch.imageUrl) {
    return (
      <span className={styles.swatchPreview}>
        <img src={swatch.imageUrl} alt="" className={styles.swatchPreviewImg} />
      </span>
    );
  }

  if (swatch.type === "image") {
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
          const styleOption = STYLE_OPTIONS.find((s) => s.key === option.style);
          const showSwatch = option.style === "swatch";

          return (
            <div key={option.id} className={styles.optionGroup}>
              <Flex align="center" gap={8} className={styles.optionHeader}>
                <Typography.Text strong className={styles.optionTitle}>
                  {option.name}
                </Typography.Text>
                {styleOption && (
                  <Tag className={styles.styleTag} icon={styleOption.icon}>
                    <span>{styleOption.label}</span>
                  </Tag>
                )}
              </Flex>
              <Flex gap={4} wrap="wrap">
                {option.values?.map((value) => (
                  <Tag
                    color="blue"
                    key={value.id}
                    variant="outlined"
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
                    {value.label}
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
