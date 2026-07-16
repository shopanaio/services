"use client";

import { useState } from "react";
import { Alert, Button, Descriptions, Empty, Flex, Progress, Skeleton, Statistic, Typography } from "antd";
import { BarChartOutlined, ShoppingOutlined, StarFilled } from "@ant-design/icons";
import { DataLayout } from "@/layouts/data";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useEntityPicker } from "@/shared/components/entity-picker-modal";
import type { IPickableEntity } from "@/shared/components/entity-picker-modal/types";
import "@/shared/components/entity-picker-modal/configs/product-picker-config";
import { useProductContentSummaries } from "../hooks";

interface ReviewSummary { reviewCount: number; verifiedReviewCount: number; mediaReviewCount: number; averageRating: number; lastReviewedAt?: string | null; updatedAt: string; ratingBreakdown: Record<"rating1Count" | "rating2Count" | "rating3Count" | "rating4Count" | "rating5Count", number>; criteria: Array<{ criterion: { id: string; defaultTitle: string }; reviewCount: number; averageRating: number }> }
interface QuestionSummary { questionCount: number; answeredQuestionCount: number; unansweredQuestionCount: number; answerCount: number; officialAnswerCount: number; lastQuestionAt?: string | null; lastAnsweredAt?: string | null; updatedAt: string }

export default function ProductContentInsightsPage() {
  const [product, setProduct] = useState<IPickableEntity | null>(null); const query = useProductContentSummaries(product?.id);
  const picker = useEntityPicker<IPickableEntity>({ entityType: "product", selectionMode: "single", initialSelection: product ? [product.id] : [], onConfirm: (items) => setProduct(items[0] ?? null) });
  const review = query.data?.reviewsQuery.productReviewSummary as ReviewSummary | null | undefined; const questions = query.data?.reviewsQuery.productQuestionSummary as QuestionSummary | null | undefined;
  return <DataLayout name="content-insights" title="Product content insights" actions={<Button icon={<ShoppingOutlined />} onClick={picker.openPicker}>{product ? "Change product" : "Select product"}</Button>}>
    {query.error ? <Alert type="error" showIcon message={query.error.message} /> : null}{query.loading ? <Skeleton active /> : null}{!product ? <Empty description="Select a product to inspect review and Q&A projections" /> : null}
    {product && !query.loading ? <Flex vertical gap={12}><Paper><PaperHeader title={product.title} icon={<BarChartOutlined />} /><Typography.Text type="secondary">Published-content projections maintained by Reviews service.</Typography.Text></Paper>
      <Paper><PaperHeader title="Reviews" icon={<StarFilled />} /><Flex gap="large" wrap="wrap"><Statistic title="Reviews" value={review?.reviewCount ?? 0} /><Statistic title="Average rating" value={review?.averageRating ?? 0} precision={2} suffix="/ 5" /><Statistic title="Verified" value={review?.verifiedReviewCount ?? 0} /><Statistic title="With media" value={review?.mediaReviewCount ?? 0} /></Flex>{review ? <Flex vertical gap="small" style={{ marginTop: 20 }}>{[5, 4, 3, 2, 1].map((rating) => { const count = review.ratingBreakdown[`rating${rating}Count` as keyof ReviewSummary["ratingBreakdown"]]; return <Flex key={rating} gap="middle" align="center"><Typography.Text style={{ width: 48 }}>{rating} stars</Typography.Text><Progress percent={review.reviewCount ? Math.round((count / review.reviewCount) * 100) : 0} format={() => String(count)} /></Flex>; })}</Flex> : null}</Paper>
      {review?.criteria.length ? <Paper><PaperHeader title="Criterion summaries" /><Descriptions column={1} items={review.criteria.map((item) => ({ key: item.criterion.id, label: item.criterion.defaultTitle, children: `${item.averageRating.toFixed(2)} / 5 from ${item.reviewCount} reviews` }))} /></Paper> : null}
      <Paper><PaperHeader title="Questions & answers" /><Flex gap="large" wrap="wrap"><Statistic title="Questions" value={questions?.questionCount ?? 0} /><Statistic title="Answered" value={questions?.answeredQuestionCount ?? 0} /><Statistic title="Unanswered" value={questions?.unansweredQuestionCount ?? 0} /><Statistic title="Answers" value={questions?.answerCount ?? 0} /><Statistic title="Official answers" value={questions?.officialAnswerCount ?? 0} /></Flex></Paper>
    </Flex> : null}
  </DataLayout>;
}
