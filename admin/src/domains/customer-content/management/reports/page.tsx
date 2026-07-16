"use client";

import { useState } from "react";
import { Alert, App, Button, Flex, Input, Modal, Select, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ReviewContentReportStatus } from "@/graphql/types";
import { DataLayout } from "@/layouts/data";
import { useContentReports, useManagementMutations } from "../hooks";
import type { ContentReport } from "../types";

export default function ContentReportsPage() {
  const { message } = App.useApp(); const query = useContentReports(); const mutations = useManagementMutations(); const connection = query.data?.reviewsQuery.contentReports;
  const [selected, setSelected] = useState<ContentReport | null>(null); const [assignee, setAssignee] = useState(""); const [status, setStatus] = useState<ReviewContentReportStatus | undefined>(); const [note, setNote] = useState("");
  const openReport = (report: ContentReport) => { setSelected(report); setAssignee(report.assignedToPrincipalId ?? ""); setStatus([ReviewContentReportStatus.Actioned, ReviewContentReportStatus.Dismissed].includes(report.status) ? report.status : undefined); setNote(report.resolutionNote ?? ""); };
  const save = async () => {
    if (!selected) return; const result = await mutations.updateReport(selected.id, selected.updatedAt, { assignment: { assignedToPrincipalId: assignee.trim() || null }, resolution: status ? { status, note: note.trim() || null } : undefined });
    if (result.errors.length) return message.error(result.errors.map((item) => item.message).join(" ")); await query.refetch(); setSelected(null); message.success("Report updated");
  };
  const columns: ColumnsType<ContentReport> = [
    { title: "Reported content", key: "content", render: (_, item) => <Flex vertical><Typography.Text ellipsis style={{ maxWidth: 460 }}>{item.content.body}</Typography.Text><Typography.Text type="secondary">{item.content.__typename} · {item.content.author.displayName}</Typography.Text></Flex> },
    { title: "Reason", dataIndex: "reason", width: 170, render: (value) => String(value).toLowerCase().replaceAll("_", " ") },
    { title: "Reporter", key: "reporter", width: 190, render: (_, item) => item.reporterCustomer?.displayName ?? "Anonymous" },
    { title: "Status", dataIndex: "status", width: 120, render: (value) => <Tag color={value === ReviewContentReportStatus.Open ? "gold" : value === ReviewContentReportStatus.Actioned ? "green" : undefined}>{String(value).toLowerCase()}</Tag> },
    { title: "Assignee", dataIndex: "assignedToPrincipalId", width: 170, render: (value) => value ?? "Unassigned" },
    { title: "Created", dataIndex: "createdAt", width: 180, render: (value) => new Date(value).toLocaleString() },
  ];
  return <DataLayout fullWidth name="content-reports" title="Content reports" count={connection?.totalCount ?? 0}>
    {query.error ? <Alert type="error" showIcon message={query.error.message} /> : null}<Table rowKey="id" loading={query.loading} dataSource={connection?.edges.map((edge) => edge.node) ?? []} columns={columns} pagination={{ pageSize: 20, showSizeChanger: true }} onRow={(report) => ({ onClick: () => openReport(report), style: { cursor: "pointer" } })} />
    <Modal title="Content report" open={!!selected} onCancel={() => setSelected(null)} footer={<Flex justify="flex-end" gap="small"><Button onClick={() => setSelected(null)}>Cancel</Button><Button type="primary" loading={mutations.loading} onClick={save}>Save</Button></Flex>}>
      <Flex vertical gap="middle"><Alert type="info" message={selected?.details || "No reporter details"} /><div><Typography.Text strong>Assigned principal</Typography.Text><Input value={assignee} onChange={(event) => setAssignee(event.target.value)} style={{ marginTop: 8 }} /></div><div><Typography.Text strong>Resolution</Typography.Text><Select allowClear value={status} placeholder="Keep open" options={[ReviewContentReportStatus.Actioned, ReviewContentReportStatus.Dismissed].map((value) => ({ value, label: value.toLowerCase() }))} onChange={setStatus} style={{ width: "100%", marginTop: 8 }} /></div><div><Typography.Text strong>Resolution note</Typography.Text><Input.TextArea value={note} onChange={(event) => setNote(event.target.value)} rows={4} style={{ marginTop: 8 }} /></div></Flex>
    </Modal>
  </DataLayout>;
}
