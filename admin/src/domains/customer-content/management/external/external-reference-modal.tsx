"use client";

import { useEffect, useState } from "react";
import { Alert, App, Button, Descriptions, Flex, Input, Select, Typography } from "antd";
import { DeleteOutlined, FileSearchOutlined } from "@ant-design/icons";
import { ReviewExternalSyncDirection, ReviewExternalSyncStatus } from "@/graphql/types";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useManagementMutations } from "../hooks";
import type { ExternalReferenceModalPayload } from "../modals";
import { useEntityPicker } from "@/shared/components/entity-picker-modal";
import type { IPickableEntity } from "@/shared/components/entity-picker-modal/types";
import "../content-picker-config";

export function ExternalReferenceModal() {
  const { message, modal } = App.useApp(); const { payload, pop, forcePop, setDirty } = useModalStackContext(); const value = payload as ExternalReferenceModalPayload; const current = value.externalReference; const mutations = useManagementMutations();
  const [contentId, setContentId] = useState(current?.content.id ?? value.contentId ?? ""); const [system, setSystem] = useState(current?.externalSystem ?? "");
  const [contentLabel, setContentLabel] = useState(current?.content.body ?? value.contentId ?? "");
  const [type, setType] = useState(current?.externalType ?? "REVIEW"); const [externalId, setExternalId] = useState(current?.externalId ?? ""); const [url, setUrl] = useState(current?.externalUrl ?? "");
  const [direction, setDirection] = useState(current?.direction ?? ReviewExternalSyncDirection.Bidirectional); const [status, setStatus] = useState(current?.syncStatus ?? ReviewExternalSyncStatus.Pending);
  const [etag, setEtag] = useState(current?.etag ?? ""); const [checksum, setChecksum] = useState(current?.contentChecksum ?? ""); const [metadata, setMetadata] = useState(JSON.stringify(current?.metadata ?? {}, null, 2));
  const [dirty, setLocalDirty] = useState(false); const [error, setError] = useState<string | null>(null); useEffect(() => setDirty(dirty), [dirty, setDirty]); const change = () => setLocalDirty(true);
  const contentPicker = useEntityPicker<IPickableEntity>({ entityType: "review-content", selectionMode: "single", initialSelection: contentId ? [contentId] : [], onConfirm: (items, ids) => { setContentId(ids[0] ?? ""); setContentLabel(items[0]?.title ?? ids[0] ?? ""); change(); } });
  const parseMetadata = () => { try { const parsed = JSON.parse(metadata); if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error(); return parsed; } catch { setError("Metadata must be a valid JSON object."); return null; } };
  const save = async () => {
    setError(null); const parsed = parseMetadata(); if (!parsed) return; if (!contentId.trim() || !system.trim() || !type.trim() || !externalId.trim()) return setError("Content, system, type and external ID are required.");
    const result = current ? await mutations.updateExternalReference(current.id, current.updatedAt, { identity: { externalSystem: system.trim(), externalType: type.trim(), externalId: externalId.trim(), externalUrl: url.trim() || null }, sync: { direction, status, etag: etag.trim() || null, contentChecksum: checksum.trim() || null, metadata: parsed } }) : await mutations.createExternalReference({ contentId: contentId.trim(), externalSystem: system.trim(), externalType: type.trim(), externalId: externalId.trim(), externalUrl: url.trim() || null, direction, metadata: parsed });
    if (result.errors.length) return setError(result.errors.map((item) => item.message).join(" ")); await value.onSaved?.(); setDirty(false); message.success(current ? "External reference updated" : "External reference created"); forcePop();
  };
  const remove = async () => {
    if (!current) return; const confirmed = await modal.confirm({ title: "Delete external reference?", okText: "Delete", okButtonProps: { danger: true } }); if (!confirmed) return;
    const result = await mutations.deleteExternalReference({ id: current.id, expectedUpdatedAt: current.updatedAt }); if (result.errors.length) return setError(result.errors.map((item) => item.message).join(" ")); await value.onSaved?.(); message.success("External reference deleted"); forcePop();
  };
  return <ModalLayout name="external-reference" header={<ModalHeader name="external-reference" title={current ? `${current.externalSystem} reference` : "New external reference"} onClose={pop} submitButtonProps={{ children: current ? "Save" : "Create", loading: mutations.loading, disabled: (!!current && !dirty) || !contentId || !system || !type || !externalId, onClick: save }} />}>
    {error ? <Alert type="error" showIcon message={error} /> : null}<Paper><PaperHeader title="Identity" /><Flex vertical gap="middle"><div><Typography.Text strong>Content *</Typography.Text><Flex gap="small" style={{ marginTop: 8 }}><Input readOnly value={contentLabel} /><Button icon={<FileSearchOutlined />} disabled={!!current || !!value.contentId} onClick={contentPicker.openPicker}>Select</Button></Flex></div><Flex gap="middle"><div style={{ flex: 1 }}><Typography.Text strong>External system *</Typography.Text><Input value={system} onChange={(event) => { setSystem(event.target.value); change(); }} style={{ marginTop: 8 }} /></div><div style={{ flex: 1 }}><Typography.Text strong>External type *</Typography.Text><Input value={type} onChange={(event) => { setType(event.target.value); change(); }} style={{ marginTop: 8 }} /></div></Flex><div><Typography.Text strong>External ID *</Typography.Text><Input value={externalId} onChange={(event) => { setExternalId(event.target.value); change(); }} style={{ marginTop: 8 }} /></div><div><Typography.Text strong>External URL</Typography.Text><Input type="url" value={url} onChange={(event) => { setUrl(event.target.value); change(); }} style={{ marginTop: 8 }} /></div></Flex></Paper>
    <Paper><PaperHeader title="Synchronization" /><Flex vertical gap="middle"><Select value={direction} options={Object.values(ReviewExternalSyncDirection).map((item) => ({ value: item, label: item.toLowerCase() }))} onChange={(next) => { setDirection(next); change(); }} />{current ? <Select value={status} options={Object.values(ReviewExternalSyncStatus).map((item) => ({ value: item, label: item.toLowerCase() }))} onChange={(next) => { setStatus(next); change(); }} /> : null}<Input value={etag} placeholder="ETag" onChange={(event) => { setEtag(event.target.value); change(); }} /><Input value={checksum} placeholder="Content checksum" onChange={(event) => { setChecksum(event.target.value); change(); }} /><div><Typography.Text strong>Metadata (JSON)</Typography.Text><Input.TextArea value={metadata} onChange={(event) => { setMetadata(event.target.value); change(); }} rows={8} style={{ marginTop: 8, fontFamily: "monospace" }} /></div></Flex></Paper>
    {current ? <><Paper><PaperHeader title="Sync state" /><Descriptions column={2} items={[{ key: "last", label: "Last synced", children: current.lastSyncedAt ? new Date(current.lastSyncedAt).toLocaleString() : "Never" }, { key: "error", label: "Last error", children: current.lastError ?? "—" }, { key: "created", label: "Created", children: new Date(current.createdAt).toLocaleString() }, { key: "updated", label: "Updated", children: new Date(current.updatedAt).toLocaleString() }]} /></Paper><Paper><PaperHeader title="Danger zone" /><Button danger icon={<DeleteOutlined />} onClick={remove}>Delete reference</Button></Paper></> : null}
  </ModalLayout>;
}
