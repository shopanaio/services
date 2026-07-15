"use client";

import { Alert, Button, Checkbox, Flex, Input, Select, Skeleton } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useDeferredValue, useMemo, useState } from "react";
import { BoardEmptyState, BoardErrorState, FulfillmentBoard, FulfillmentLayout } from "../components";
import { useFulfillmentBoard } from "../hooks";
import { FulfillmentStatus } from "../graphql/operation-types";
import { buildFulfillmentBoardQueryVariables, DEFAULT_FULFILLMENT_ORDER } from "./page-config";
import { useFulfillmentOrderModal, useFulfillmentStageModal } from "../../modals";
import { useFulfillmentBoardStyles } from "../components/fulfillment-board.styles";
import { mapFulfillmentBoardToLegacyView } from "../mappers";

export default function FulfillmentPage() {
  const { styles } = useFulfillmentBoardStyles();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [includeArchivedCancelled, setIncludeArchivedCancelled] = useState(false);
  const [fulfillmentStatuses, setFulfillmentStatuses] = useState<FulfillmentStatus[]>([]);
  const variables = useMemo(() => buildFulfillmentBoardQueryVariables({ search: deferredSearch, includeArchivedCancelled, fulfillmentStatus: fulfillmentStatuses, orderBy: DEFAULT_FULFILLMENT_ORDER }), [deferredSearch, fulfillmentStatuses, includeArchivedCancelled]);
  const query = useFulfillmentBoard(variables);
  const view = useMemo(
    () => query.connection ? mapFulfillmentBoardToLegacyView(query.connection) : null,
    [query.connection],
  );
  const stageModal = useFulfillmentStageModal();
  const orderModal = useFulfillmentOrderModal();
  const count = query.stages.reduce((total, stage) => total + stage.ticketConnection.totalCount, 0);
  const openCreateStage = () => stageModal.push({ mode: "create", initialSortIndex: Math.max(-1, ...query.stages.map((stage) => stage.sortIndex)) + 1, onSaved: query.refetch });
  const navigation = <Flex align="center" gap="small" wrap="wrap">
    <Input.Search allowClear value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search orders, customers, email or phone" style={{ width: 340 }} data-testid="fulfillment-search" />
    <Select mode="multiple" allowClear placeholder="Fulfillment status" value={fulfillmentStatuses} onChange={setFulfillmentStatuses} options={Object.values(FulfillmentStatus).map((value) => ({ value, label: value.replaceAll("_", " ") }))} style={{ minWidth: 220 }} maxTagCount="responsive" />
    <Checkbox checked={includeArchivedCancelled} onChange={(event) => setIncludeArchivedCancelled(event.target.checked)}>Show archived/cancelled</Checkbox>
    <Button icon={<ReloadOutlined />} onClick={() => void query.refetch()} aria-label="Refresh fulfillment board" />
  </Flex>;

  return <FulfillmentLayout title="Fulfillment" count={count} loading={query.loading && Boolean(query.connection)} onCreate={() => orderModal.push({ mode: "create", onSaved: query.refetch })} navigation={navigation}>
    {query.error && query.connection ? <Alert type="warning" showIcon closable message="The latest board refresh failed" description={query.error.message} /> : null}
    {query.loading && !query.connection ? <div className={styles.skeleton}>{Array.from({ length: 4 }, (_, index) => <div className={styles.skeletonColumn} key={index}><Skeleton active title paragraph={{ rows: 8 }} /></div>)}</div> : null}
    {!query.loading && query.error && !query.connection ? <BoardErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
    {!query.loading && !query.error && query.connection && !query.connection.totalCount ? <BoardEmptyState onCreate={openCreateStage} /> : null}
    {view ? <FulfillmentBoard view={view} onRefetch={query.refetch} onOpenOrder={(entityId) => orderModal.push({ mode: "edit", entityId, onSaved: query.refetch })} onEditStage={(column) => stageModal.push({ mode: "edit", entityId: column.id, onSaved: query.refetch })} onCreateStage={openCreateStage} /> : null}
  </FulfillmentLayout>;
}
