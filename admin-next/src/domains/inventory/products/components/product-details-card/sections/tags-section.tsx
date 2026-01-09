"use client";

import { useState } from "react";
import { Tag, Typography, Flex, Dropdown } from "antd";
import { PlusOutlined, MoreOutlined } from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useTagPicker } from "@/shared/components/entity-picker-modal";
import type { IPickableEntity } from "@/shared/components/entity-picker-modal";
import type { ITag } from "../../../modals";

interface ITagsSectionProps {
  tags?: ITag[];
}

export const TagsSection = ({ tags: initialTags = [] }: ITagsSectionProps) => {
  const [tags, setTags] = useState<ITag[]>(initialTags);

  const deleteTag = (id: string) => {
    setTags((prev) => prev.filter((tag) => tag.id !== id));
  };

  const { openPicker } = useTagPicker({
    initialSelection: tags.map((tag) => tag.id),
    onConfirm: (entities: IPickableEntity[]) => {
      const existingById = new Map(tags.map((t) => [t.id, t]));
      const newTags = entities.map((entity) => {
        const existing = existingById.get(entity.id);
        if (existing) {
          return existing;
        }
        return {
          id: entity.id,
          title: entity.title,
          slug: entity.id,
          color: "#1677ff",
        } satisfies ITag;
      });
      setTags(newTags);
    },
  });

  const hasTags = tags.length > 0;

  return (
    <Paper>
      <PaperHeader title="Tags" />
      {hasTags ? (
        <Flex gap={4} wrap="wrap">
          {tags.map((tag) => (
            <Dropdown
              key={tag.id}
              trigger={["click"]}
              menu={{
                items: [
                  {
                    key: "delete",
                    label: "Delete tag",
                    onClick: () => deleteTag(tag.id),
                  },
                ],
              }}
            >
              <Tag style={{ cursor: "pointer" }}>
                <Flex align="center" gap={4}>
                  {tag.title}
                  <MoreOutlined />
                </Flex>
              </Tag>
            </Dropdown>
          ))}
          <Tag color="default" onClick={openPicker} style={{ cursor: "pointer" }}>
            <Flex align="center" gap={4}>
              <PlusOutlined />
              Tag
            </Flex>
          </Tag>
        </Flex>
      ) : (
        <Flex gap={4} wrap="wrap">
          <Tag color="default" onClick={openPicker} style={{ cursor: "pointer" }}>
            <Flex align="center" gap={4}>
              <PlusOutlined />
              Tag
            </Flex>
          </Tag>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            No tags assigned
          </Typography.Text>
        </Flex>
      )}
    </Paper>
  );
};
