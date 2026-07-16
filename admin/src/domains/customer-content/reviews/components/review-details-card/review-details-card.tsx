"use client";

import { App, Button, Descriptions, Dropdown, Empty, Flex, List, Rate, Statistic, Tag, Typography } from "antd";
import { LuTrash2 as DeleteOutlined, LuPencil as EditOutlined, LuEllipsis as MoreOutlined, LuBadgeCheck as SafetyCertificateOutlined, LuStar as StarFilled, LuBan as StopOutlined } from "react-icons/lu";
import type { ApiReview } from "@/graphql/types";
import { ReviewContentStatus, ReviewVerificationStatus } from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { ContentDetailsSections } from "@/domains/customer-content/shared/components";
import type { ReviewEditSection } from "../../modals";

interface ReviewDetailsCardProps {
  review: ApiReview;
  onEdit: (section: ReviewEditSection) => void;
  onDelete: () => Promise<void> | void;
  onRedact: () => Promise<void> | void;
  onManageExternalReferences?: () => void;
}

const statusColor: Record<ReviewContentStatus, string> = {
  [ReviewContentStatus.Pending]: "gold",
  [ReviewContentStatus.Published]: "green",
  [ReviewContentStatus.Rejected]: "red",
};
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString() : "—";

export function ReviewDetailsCard({ review, onEdit, onDelete, onRedact, onManageExternalReferences }: ReviewDetailsCardProps) {
  const { modal } = App.useApp();
  const confirm = (kind: "delete" | "redact") => modal.confirm({
    title: kind === "delete" ? "Delete review?" : "Redact review?",
    content: kind === "delete" ? "The review will be soft-deleted." : "Personal content will be irreversibly redacted.",
    okText: kind === "delete" ? "Delete" : "Redact",
    okButtonProps: { danger: true },
    onOk: kind === "delete" ? onDelete : onRedact,
  });

  return (
    <Flex vertical gap={12} style={{ width: "100%" }} data-testid="review-details-card">
      <Paper>
        <Flex justify="space-between" align="flex-start" gap="middle" wrap="wrap">
          <Flex vertical gap={6}>
            <Flex gap={8} align="center" wrap="wrap">
              <Rate disabled value={review.rating} />
              <Tag color={statusColor[review.status]}>{review.status.toLowerCase()}</Tag>
              {review.isVerifiedPurchase ? <Tag color="green">Verified purchase</Tag> : null}
              {review.isIncentivized ? <Tag color="blue">Incentivized</Tag> : null}
            </Flex>
            <Typography.Title level={3} style={{ margin: 0 }}>{review.title || "Untitled review"}</Typography.Title>
            <Typography.Text type="secondary">By {review.author.displayName} · {formatDate(review.createdAt)}</Typography.Text>
          </Flex>
          <Flex gap="small">
            <Button icon={<EditOutlined />} onClick={() => onEdit("content")}>Edit</Button>
            <Dropdown menu={{ items: [
              { key: "redact", label: "Redact content", icon: <StopOutlined />, danger: true, onClick: () => confirm("redact") },
              { key: "delete", label: "Delete review", icon: <DeleteOutlined />, danger: true, onClick: () => confirm("delete") },
            ] }}><Button icon={<MoreOutlined />} /></Dropdown>
          </Flex>
        </Flex>
      </Paper>

      <Paper>
        <PaperHeader title="Review content" actions={<Button size="small" onClick={() => onEdit("content")}>Edit</Button>} />
        <Typography.Paragraph style={{ whiteSpace: "pre-wrap", fontSize: 16 }}>{review.body}</Typography.Paragraph>
        <Descriptions column={{ xs: 1, sm: 2 }} items={[
          { key: "locale", label: "Locale", children: review.locale },
        ]} />
      </Paper>

      <Paper>
        <PaperHeader title="Moderation" actions={<Button size="small" onClick={() => onEdit("moderation")}>Edit</Button>} />
        <Descriptions column={{ xs: 1, sm: 2 }} items={[
          { key: "status", label: "Status", children: <Tag color={statusColor[review.status]}>{review.status.toLowerCase()}</Tag> },
          { key: "note", label: "Internal note", children: review.moderationNote ?? "—" },
          { key: "moderated", label: "Moderated at", children: formatDate(review.moderatedAt) },
          { key: "moderator", label: "Moderator", children: review.moderatedByPrincipalId ?? "—" },
        ]} />
      </Paper>

      <Paper>
        <PaperHeader title="Subject & order evidence" />
        <Descriptions column={{ xs: 1, sm: 2 }} items={[
          { key: "product", label: "Product", children: review.product.title },
          { key: "variant", label: "Variant", children: review.variant?.title ?? review.variant?.id ?? "—" },
          { key: "order", label: "Order ID", children: review.orderId ? <Typography.Text copyable>{review.orderId}</Typography.Text> : "—" },
          { key: "line", label: "Order line ID", children: review.orderLineId ? <Typography.Text copyable>{review.orderLineId}</Typography.Text> : "—" },
        ]} />
      </Paper>

      <Paper>
        <PaperHeader title="Ratings" icon={<StarFilled />} actions={<Button size="small" onClick={() => onEdit("content")}>Edit</Button>} />
        <Flex gap="large" wrap="wrap"><Statistic title="Overall" value={review.rating} suffix="/ 5" />{review.ratings.map((item) => <Statistic key={item.criterion.id} title={item.criterion.defaultTitle} value={item.value} suffix="/ 5" />)}</Flex>
      </Paper>

      <Paper>
        <PaperHeader title="Trust & incentive" icon={<SafetyCertificateOutlined />} actions={<Button size="small" onClick={() => onEdit("trust")}>Edit</Button>} />
        <Descriptions column={{ xs: 1, sm: 2 }} items={[
          { key: "status", label: "Verification", children: <Tag color={review.verificationStatus === ReviewVerificationStatus.Verified ? "green" : undefined}>{review.verificationStatus.toLowerCase()}</Tag> },
          { key: "method", label: "Method", children: review.verificationMethod ?? "—" },
          { key: "verified", label: "Verified at", children: formatDate(review.verifiedAt) },
          { key: "incentive", label: "Incentive disclosure", children: review.incentiveDisclosure ?? "—" },
        ]} />
      </Paper>

      <Paper>
        <PaperHeader title={`Customer media (${review.media.length})`} actions={<Button size="small" onClick={() => onEdit("media")}>Edit</Button>} />
        {review.media.length ? <List grid={{ gutter: 12, xs: 1, sm: 2 }} dataSource={review.media} renderItem={(item) => <List.Item><List.Item.Meta title={<a href={item.file.url} target="_blank" rel="noreferrer">{item.file.originalName}</a>} description={<Flex vertical><span>{item.caption ?? "No caption"}</span><Tag style={{ width: "fit-content" }}>{item.status.toLowerCase()}</Tag></Flex>} /></List.Item>} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No media" />}
      </Paper>

      <Paper>
        <PaperHeader title={`Replies (${review.replies.totalCount})`} />
        {review.replies.edges.length ? <List dataSource={review.replies.edges.map((edge) => edge.node)} renderItem={(reply) => <List.Item><List.Item.Meta title={<Flex gap={6}><Typography.Text strong>{reply.author.displayName}</Typography.Text>{reply.isOfficial ? <Tag color="blue">Official</Tag> : null}<Tag>{reply.status.toLowerCase()}</Tag></Flex>} description={reply.body} /></List.Item>} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No replies" />}
      </Paper>

      <ContentDetailsSections content={review} onManageExternalReferences={onManageExternalReferences} />
    </Flex>
  );
}
