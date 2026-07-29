"use client";

import { Button, Dropdown, Flex, Tag } from "antd";
import { LuEllipsis, LuPlus, LuTags } from "react-icons/lu";
import { useTagPicker } from "@/shared/components/entity-picker-modal";
import type { IPickableEntity } from "@/shared/components/entity-picker-modal/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EntityDetailsEmptyState } from "./entity-details-empty-state";

export interface EntityDetailsTagItem {
  id: string;
  name: string;
  handle?: string | null;
}

interface EntityTagsSectionProps {
  tags: EntityDetailsTagItem[];
  isPending?: boolean;
  onAdd: (entities: IPickableEntity[]) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  testIdPrefix: string;
  emptyDescription: string;
  className?: string;
  headerClassName?: string;
}

export function EntityTagsSection({
  tags,
  isPending = false,
  onAdd,
  onDelete,
  testIdPrefix,
  emptyDescription,
  className,
  headerClassName,
}: EntityTagsSectionProps) {
  const { openPicker } = useTagPicker({
    excludeIds: tags.map((tag) => tag.id),
    onConfirm: (entities) => {
      void onAdd(entities);
    },
  });
  const hasTags = tags.length > 0;

  return (
    <Paper
      className={className}
      data-testid={`${testIdPrefix}-section`}
    >
      <PaperHeader
        title="Tags"
        className={headerClassName}
        actions={
          !hasTags ? (
            <Button
              size="small"
              icon={<LuPlus />}
              onClick={isPending ? undefined : openPicker}
              data-testid={`${testIdPrefix}-add-button`}
              disabled={isPending}
            >
              Add Tag
            </Button>
          ) : undefined
        }
      />
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
                    label: (
                      <span
                        data-testid={`${testIdPrefix}-delete-menu-item-${
                          tag.handle ?? tag.id
                        }`}
                      >
                        Delete tag
                      </span>
                    ),
                    onClick: () => {
                      void onDelete(tag.id);
                    },
                    disabled: isPending,
                  },
                ],
              }}
            >
              <Tag
                style={{ cursor: "pointer" }}
                data-testid={`${testIdPrefix}-item-${tag.handle ?? tag.id}`}
              >
                <Flex align="center" gap={4}>
                  {tag.name}
                  <LuEllipsis />
                </Flex>
              </Tag>
            </Dropdown>
          ))}
          <Tag
            variant="outlined"
            onClick={isPending ? undefined : openPicker}
            data-testid={`${testIdPrefix}-add-button`}
            style={{
              cursor: isPending ? "not-allowed" : "pointer",
              background: "transparent",
              borderStyle: "dashed",
            }}
          >
            <Flex align="center" gap={4}>
              <LuPlus />
              Add Tag
            </Flex>
          </Tag>
        </Flex>
      ) : (
        <EntityDetailsEmptyState
          icon={<LuTags />}
          state={{
            title: "No tags added",
            description: emptyDescription,
          }}
        />
      )}
    </Paper>
  );
}
