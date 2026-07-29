"use client";

import { Button, Flex, Typography } from "antd";
import {
  LuCircle,
  LuCircleCheck,
  LuEllipsis,
  LuRadioTower,
  LuShoppingBag,
  LuSmartphone,
  LuStore,
} from "react-icons/lu";
import type { ApiDiscount } from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EntityDetailsEmptyState } from "@/domains/inventory/components/entity-details-sections";
import { useDiscountSectionStyles } from "../discount-details-card.styles";

interface ChannelsSectionProps {
  discount: ApiDiscount;
  onEdit?: () => void;
}

export function ChannelsSection({
  discount,
  onEdit,
}: ChannelsSectionProps) {
  const { styles } = useDiscountSectionStyles();
  const channelPresentation = {
    "online-store": { label: "Online store", icon: <LuStore /> },
    "mobile-app": { label: "Mobile app", icon: <LuSmartphone /> },
    "point-of-sale": { label: "POS", icon: <LuShoppingBag /> },
  } as const;

  return (
    <Paper className={styles.section} data-testid="discount-channels-section">
      <PaperHeader
        title="Channels"
        className={styles.compactHeader}
        actions={
          onEdit ? (
            <Button
              size="small"
              icon={<LuEllipsis />}
              aria-label="Edit discount channels"
              onClick={onEdit}
            />
          ) : undefined
        }
      />

      {discount.channels.length > 0 ? (
        <>
          <div className={styles.entityList}>
            {(["online-store", "mobile-app", "point-of-sale"] as const).map(
              (code) => {
                const channel = discount.channels.find(
                  (candidate) => candidate.code === code,
                );
                const presentation = channelPresentation[code];
                return (
                  <div className={styles.listRow} key={code}>
                    <Flex align="center" justify="space-between" gap={8}>
                      <Flex align="center" gap={8}>
                        <span
                          className={
                            channel
                              ? styles.channelIconActive
                              : styles.channelIconInactive
                          }
                        >
                          {presentation.icon}
                        </span>
                        <Typography.Text
                          type={channel ? undefined : "secondary"}
                        >
                          {presentation.label}
                        </Typography.Text>
                      </Flex>
                      {channel ? (
                        <LuCircleCheck className={styles.primaryIcon} />
                      ) : (
                        <LuCircle className={styles.neutralIcon} />
                      )}
                    </Flex>
                  </div>
                );
              },
            )}
          </div>
          <Typography.Text className={styles.caption}>
            {discount.channels.length} of 3 active
          </Typography.Text>
        </>
      ) : (
        <EntityDetailsEmptyState
          icon={<LuRadioTower />}
          state={{
            title: "No sales channels selected",
            description:
              "Choose where customers can use this discount.",
          }}
        />
      )}
    </Paper>
  );
}
