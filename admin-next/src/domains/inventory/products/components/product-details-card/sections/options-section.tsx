"use client";

import { Typography, Tag, Flex } from "antd";
import { Paper } from "../../paper";
import { PaperHeader } from "../../paper-header";
import { EditAction } from "../../edit-action";
import { useOptionsStyles } from "../product-details-card.styles";

interface IOptionFeature {
  id: string;
  title: string;
}

interface IOption {
  id: string;
  title: string;
  features?: IOptionFeature[];
}

interface IOptionsSectionProps {
  options: IOption[];
  onEdit: () => void;
}

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
      <Flex vertical gap={8}>
        {options.map((option) => (
          <div key={option.id}>
            <Typography.Text type="secondary" className={styles.optionTitle}>
              {option.title}
            </Typography.Text>
            <Flex gap={4} wrap="wrap">
              {option.features?.map((f) => (
                <Tag key={f.id} className={styles.optionTag} variant="outlined">
                  {f.title}
                </Tag>
              ))}
            </Flex>
          </div>
        ))}
      </Flex>
    </Paper>
  );
};
