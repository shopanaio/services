"use client";

import { Tag, Typography, Flex } from "antd";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EditAction } from "../../edit-action";

interface ITag {
  id: string;
  title: string;
}

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
