"use client";

import { useEffect } from "react";
import { Alert, Empty, Flex, Skeleton } from "antd";
import { ModalLayout, useModalStackContext } from "@/layouts/modals";
import { TagDetailsCard } from "../../components/tag-details-card";
import { useTag } from "../../hooks";
import type { ITagModalPayload } from "../../modals";

export const TagModal = () => {
  const { payload, pop, forcePop } = useModalStackContext();
  const typedPayload = payload as ITagModalPayload;
  const tagId =
    typeof typedPayload.entityId === "string" ? typedPayload.entityId : null;
  const { tag, loading, error, refetch } = useTag(tagId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        pop();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pop]);

  const renderContent = () => {
    if (loading && !tag) {
      return (
        <Flex vertical gap={16} style={{ padding: 16 }}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </Flex>
      );
    }

    if (error) {
      return <Alert type="error" message={error.message} showIcon />;
    }

    if (!tag) {
      return (
        <Flex align="center" justify="center" style={{ padding: 24 }}>
          <Empty description="Tag not found" />
        </Flex>
      );
    }

    return <TagDetailsCard tag={tag} onRefetch={refetch} />;
  };

  return (
    <ModalLayout
      name="tag"
      headerProps={{
        title: "Tag",
        onClose: forcePop,
        submitButtonProps: null,
      }}
    >
      {renderContent()}
    </ModalLayout>
  );
};
