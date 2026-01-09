"use client";

import { Tag, Typography, Flex } from "antd";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EditAction } from "../../edit-action";

interface ICategory {
  id: string;
  title: string;
}

interface ITag {
  id: string;
  title: string;
}

interface ICategoriesSectionProps {
  primaryCategory?: ICategory | null;
  categories?: ICategory[];
  onEdit: () => void;
}

export const CategoriesSection = ({
  primaryCategory,
  categories = [],
  onEdit,
}: ICategoriesSectionProps) => {
  const hasCategories = primaryCategory || categories.length > 0;

  return (
    <Paper>
      <PaperHeader
        title="Categories"
        actions={<EditAction label="Edit categories" onEdit={onEdit} />}
      />
      {hasCategories ? (
        <Flex gap={4} wrap="wrap">
          {primaryCategory && (
            <Tag color="blue-inverse">{primaryCategory.title}</Tag>
          )}
          {categories
            .filter((cat) => cat.id !== primaryCategory?.id)
            .map((cat) => (
              <Tag key={cat.id} color="blue">
                {cat.title}
              </Tag>
            ))}
        </Flex>
      ) : (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          No categories assigned
        </Typography.Text>
      )}
    </Paper>
  );
};

interface ITagsSectionProps {
  tags?: ITag[];
  onEdit: () => void;
}

export const TagsSection = ({ tags = [], onEdit }: ITagsSectionProps) => {
  return (
    <Paper>
      <PaperHeader
        title="Tags"
        actions={<EditAction label="Edit tags" onEdit={onEdit} />}
      />
      {tags.length > 0 ? (
        <Flex gap={4} wrap="wrap">
          {tags.map((tag) => (
            <Tag key={tag.id} variant="outlined">
              {tag.title}
            </Tag>
          ))}
        </Flex>
      ) : (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          No tags assigned
        </Typography.Text>
      )}
    </Paper>
  );
};
