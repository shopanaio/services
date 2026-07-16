"use client";

import { useEffect, useState } from "react";
import { Alert, App, Button, Flex, Input, InputNumber, Select, Typography } from "antd";
import { ReviewModerationCaseStatus } from "@/graphql/types";
import { LuFileSearch as FileSearchOutlined } from "react-icons/lu";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useManagementMutations } from "../hooks";
import type { ModerationCaseModalPayload } from "../modals";
import { useEntityPicker } from "@/shared/components/entity-picker-modal";
import type { IPickableEntity } from "@/shared/components/entity-picker-modal/types";
import "../content-picker-config";

export function ModerationCaseModal() {
  const { message } = App.useApp(); const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const value = payload as ModerationCaseModalPayload; const current = value.moderationCase; const mutations = useManagementMutations();
  const [contentId, setContentId] = useState(current?.content.id ?? value.contentId ?? ""); const [priority, setPriority] = useState(current?.priority ?? 0);
  const [contentLabel, setContentLabel] = useState(current?.content.body ?? value.contentId ?? "");
  const [reasonCode, setReasonCode] = useState(current?.reasonCode ?? "MANUAL_REVIEW"); const [assignedTo, setAssignedTo] = useState(current?.assignedToPrincipalId ?? "");
  const [dueAt, setDueAt] = useState(current?.dueAt?.slice(0, 16) ?? ""); const [resolutionStatus, setResolutionStatus] = useState<ReviewModerationCaseStatus | undefined>();
  const [resolutionCode, setResolutionCode] = useState(current?.resolutionCode ?? ""); const [resolutionNote, setResolutionNote] = useState(current?.resolutionNote ?? "");
  const [dirty, setLocalDirty] = useState(false); const [error, setError] = useState<string | null>(null); useEffect(() => setDirty(dirty), [dirty, setDirty]); const change = () => setLocalDirty(true);
  const contentPicker = useEntityPicker<IPickableEntity>({ entityType: "review-content", selectionMode: "single", initialSelection: contentId ? [contentId] : [], onConfirm: (items, ids) => { setContentId(ids[0] ?? ""); setContentLabel(items[0]?.title ?? ids[0] ?? ""); change(); } });
  const save = async () => {
    setError(null); if (!contentId.trim() || !reasonCode.trim()) return setError("Content and reason code are required.");
    const result = current ? await mutations.updateCase(current.id, current.updatedAt, {
      details: { priority, reasonCode: reasonCode.trim(), assignedToPrincipalId: assignedTo.trim() || null, dueAt: dueAt ? new Date(dueAt).toISOString() : null },
      resolution: resolutionStatus ? { status: resolutionStatus, resolutionCode: resolutionCode.trim() || null, resolutionNote: resolutionNote.trim() || null } : undefined,
    }) : await mutations.createCase({ contentId: contentId.trim(), priority, reasonCode: reasonCode.trim(), assignedToPrincipalId: assignedTo.trim() || null, dueAt: dueAt ? new Date(dueAt).toISOString() : null });
    if (result.errors.length) return setError(result.errors.map((item) => item.message).join(" "));
    await value.onSaved?.(); setDirty(false); message.success(current ? "Moderation case updated" : "Moderation case created"); forcePop();
  };
  return <ModalLayout name="moderation-case" header={<ModalHeader name="moderation-case" title={current ? "Moderation case" : "New moderation case"} onClose={pop} extra={current ? <Typography.Text type="secondary">{current.status.toLowerCase()}</Typography.Text> : null} submitButtonProps={{ children: current ? "Save" : "Create", loading: mutations.loading, disabled: !contentId || !reasonCode || (!!current && !dirty), onClick: save }} />}>
    {error ? <Alert type="error" showIcon message={error} /> : null}<Paper><PaperHeader title="Case details" /><Flex vertical gap="middle">
      <div><Typography.Text strong>Content *</Typography.Text><Flex gap="small" style={{ marginTop: 8 }}><Input readOnly value={contentLabel} /><Button icon={<FileSearchOutlined />} disabled={!!current || !!value.contentId} onClick={contentPicker.openPicker}>Select</Button></Flex></div>
      <Flex gap="middle"><div style={{ flex: 1 }}><Typography.Text strong>Reason code *</Typography.Text><Input value={reasonCode} onChange={(event) => { setReasonCode(event.target.value); change(); }} style={{ marginTop: 8 }} /></div><div><Typography.Text strong>Priority</Typography.Text><br /><InputNumber min={0} max={100} value={priority} onChange={(next) => { setPriority(next ?? 0); change(); }} /></div></Flex>
      <div><Typography.Text strong>Assigned principal</Typography.Text><Input value={assignedTo} onChange={(event) => { setAssignedTo(event.target.value); change(); }} style={{ marginTop: 8 }} /></div>
      <div><Typography.Text strong>Due at</Typography.Text><Input type="datetime-local" value={dueAt} onChange={(event) => { setDueAt(event.target.value); change(); }} style={{ marginTop: 8 }} /></div>
    </Flex></Paper>{current ? <Paper><PaperHeader title="Resolution" /><Flex vertical gap="middle"><Select allowClear placeholder="Leave case open" value={resolutionStatus} options={[ReviewModerationCaseStatus.Resolved, ReviewModerationCaseStatus.Cancelled].map((status) => ({ value: status, label: status.toLowerCase() }))} onChange={(next) => { setResolutionStatus(next); change(); }} /><Input value={resolutionCode} placeholder="Resolution code" onChange={(event) => { setResolutionCode(event.target.value); change(); }} /><Input.TextArea value={resolutionNote} placeholder="Resolution note" rows={4} onChange={(event) => { setResolutionNote(event.target.value); change(); }} /></Flex></Paper> : null}
  </ModalLayout>;
}
