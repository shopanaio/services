"use client";

import { useEffect, useState } from "react";
import { Alert, App, Button, Collapse, Descriptions, Dropdown, Flex, Input, Select, Typography } from "antd";
import { LuEllipsis as MoreOutlined, LuFileSearch as FileSearchOutlined, LuTrash2 as DeleteOutlined } from "react-icons/lu";
import { ReviewExternalSyncDirection, ReviewExternalSyncStatus } from "@/graphql/types";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useManagementMutations } from "../hooks";
import type { ExternalReferenceModalPayload } from "../modals";
import { useEntityPicker } from "@/shared/components/entity-picker-modal";
import type { IPickableEntity } from "@/shared/components/entity-picker-modal/types";
import { formatDetailDate } from "@/domains/inventory/utils/format-detail-date";
import "../content-picker-config";

const humanizeEnum = (value: string) => value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
const errorMessage = (cause: unknown, fallback: string) => cause instanceof Error ? cause.message : fallback;

export function ExternalReferenceModal() {
  const { message, modal } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const value = payload as ExternalReferenceModalPayload;
  const current = value.externalReference;
  const currentContent = current && "content" in current ? current.content : null;
  const mutations = useManagementMutations();
  const [contentId, setContentId] = useState(currentContent?.id ?? value.contentId ?? "");
  const [contentLabel, setContentLabel] = useState(value.contentLabel ?? currentContent?.body ?? value.contentId ?? "");
  const [system, setSystem] = useState(current?.externalSystem ?? "");
  const [type, setType] = useState(current?.externalType ?? "REVIEW");
  const [externalId, setExternalId] = useState(current?.externalId ?? "");
  const [url, setUrl] = useState(current?.externalUrl ?? "");
  const [direction, setDirection] = useState(current?.direction ?? ReviewExternalSyncDirection.Bidirectional);
  const [status, setStatus] = useState(current?.syncStatus ?? ReviewExternalSyncStatus.Pending);
  const [etag, setEtag] = useState(current?.etag ?? "");
  const [checksum, setChecksum] = useState(current?.contentChecksum ?? "");
  const [metadata, setMetadata] = useState(JSON.stringify(current?.metadata ?? {}, null, 2));
  const [dirty, setLocalDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setDirty(dirty), [dirty, setDirty]);
  const change = () => setLocalDirty(true);

  const contentPicker = useEntityPicker<IPickableEntity>({
    entityType: "review-content",
    selectionMode: "single",
    initialSelection: contentId ? [contentId] : [],
    onConfirm: (items, ids) => {
      setContentId(ids[0] ?? "");
      setContentLabel(items[0]?.title ?? ids[0] ?? "");
      change();
    },
  });

  const parseMetadata = () => {
    try {
      const parsed = JSON.parse(metadata);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error();
      return parsed;
    } catch {
      setError("Metadata must be a valid JSON object.");
      return null;
    }
  };

  const save = async () => {
    setError(null);
    const parsed = parseMetadata();
    if (!parsed) return;
    if (!contentId.trim() || !system.trim() || !type.trim() || !externalId.trim()) {
      setError("Content, system, type and external ID are required.");
      return;
    }
    try {
      const result = current
        ? await mutations.updateExternalReference(current.id, current.updatedAt, {
            identity: { externalSystem: system.trim(), externalType: type.trim(), externalId: externalId.trim(), externalUrl: url.trim() || null },
            sync: { direction, status, etag: etag.trim() || null, contentChecksum: checksum.trim() || null, metadata: parsed },
          })
        : await mutations.createExternalReference({
            contentId: contentId.trim(),
            externalSystem: system.trim(),
            externalType: type.trim(),
            externalId: externalId.trim(),
            externalUrl: url.trim() || null,
            direction,
            metadata: parsed,
          });
      if (result.errors.length) {
        setError(result.errors.map((item) => item.message).join(" "));
        return;
      }
      await value.onSaved?.();
      setDirty(false);
      message.success(current ? "External reference updated" : "External reference created");
      forcePop();
    } catch (cause) {
      setError(errorMessage(cause, "Unable to save external reference."));
    }
  };

  const remove = async () => {
    if (!current) return;
    const confirmed = await modal.confirm({
      title: "Delete external reference?",
      content: "The external reference will be removed from this review.",
      okText: "Delete",
      okButtonProps: { danger: true },
    });
    if (!confirmed) return;
    try {
      const result = await mutations.deleteExternalReference({ id: current.id, expectedUpdatedAt: current.updatedAt });
      if (result.errors.length) {
        setError(result.errors.map((item) => item.message).join(" "));
        return;
      }
      await value.onSaved?.();
      message.success("External reference deleted");
      forcePop();
    } catch (cause) {
      setError(errorMessage(cause, "Unable to delete external reference."));
    }
  };

  return (
    <ModalLayout
      name="external-reference"
      header={(
        <ModalHeader
          name="external-reference"
          title={current ? "Edit external reference" : "New external reference"}
          onClose={pop}
          extra={current ? (
            <Dropdown menu={{ items: [{ key: "delete", label: "Delete reference", icon: <DeleteOutlined />, danger: true, "data-testid": "external-reference-delete", onClick: () => void remove() }] }}>
              <Button size="small" icon={<MoreOutlined />} aria-label="External reference actions" />
            </Dropdown>
          ) : null}
          submitButtonProps={{ children: current ? "Save" : "Create", loading: mutations.loading, disabled: (!!current && !dirty) || !contentId || !system || !type || !externalId, onClick: () => void save() }}
        />
      )}
    >
      {error ? <Alert type="error" showIcon message={error} /> : null}
      <Paper>
        <PaperHeader title="Identity" />
        <Flex vertical gap="middle">
          <div>
            <Typography.Text strong>Review</Typography.Text>
            <Flex gap="small" style={{ marginTop: 8 }}>
              <Input readOnly value={contentLabel} />
              <Button icon={<FileSearchOutlined />} disabled={Boolean(current || value.contentId)} onClick={contentPicker.openPicker}>Select</Button>
            </Flex>
          </div>
          <Flex gap="middle" wrap="wrap">
            <div style={{ flex: 1, minWidth: 220 }}>
              <Typography.Text strong>External system *</Typography.Text>
              <Input autoFocus value={system} onChange={(event) => { setSystem(event.target.value); change(); }} style={{ marginTop: 8 }} />
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <Typography.Text strong>Type *</Typography.Text>
              <Input value={type} onChange={(event) => { setType(event.target.value); change(); }} style={{ marginTop: 8 }} />
            </div>
          </Flex>
          <div>
            <Typography.Text strong>External ID *</Typography.Text>
            <Input value={externalId} onChange={(event) => { setExternalId(event.target.value); change(); }} style={{ marginTop: 8 }} />
          </div>
          <div>
            <Typography.Text strong>External URL</Typography.Text>
            <Input type="url" value={url} onChange={(event) => { setUrl(event.target.value); change(); }} style={{ marginTop: 8 }} />
          </div>
        </Flex>
      </Paper>
      <Paper>
        <PaperHeader title="Synchronization" />
        <Flex vertical gap="middle">
          <div>
            <Typography.Text strong>Direction *</Typography.Text>
            <Select value={direction} options={Object.values(ReviewExternalSyncDirection).map((item) => ({ value: item, label: humanizeEnum(item) }))} onChange={(next) => { setDirection(next); change(); }} style={{ width: "100%", marginTop: 8 }} />
          </div>
          {current ? (
            <div>
              <Typography.Text strong>Status</Typography.Text>
              <Select value={status} options={Object.values(ReviewExternalSyncStatus).map((item) => ({ value: item, label: humanizeEnum(item) }))} onChange={(next) => { setStatus(next); change(); }} style={{ width: "100%", marginTop: 8 }} />
            </div>
          ) : null}
          {current ? (
            <Descriptions column={{ xs: 1, sm: 2 }} items={[
              { key: "last", label: "Last synced", children: current.lastSyncedAt ? formatDetailDate(current.lastSyncedAt) : "Never" },
              { key: "error", label: "Last error", children: current.lastError ?? "—" },
            ]} />
          ) : null}
          <Collapse
            ghost
            items={[{
              key: "advanced",
              label: "Advanced",
              children: (
                <Flex vertical gap="middle">
                  <Input value={etag} placeholder="ETag" onChange={(event) => { setEtag(event.target.value); change(); }} />
                  <Input value={checksum} placeholder="Content checksum" onChange={(event) => { setChecksum(event.target.value); change(); }} />
                  <div>
                    <Typography.Text strong>Metadata (JSON)</Typography.Text>
                    <Input.TextArea value={metadata} onChange={(event) => { setMetadata(event.target.value); change(); }} rows={8} style={{ marginTop: 8, fontFamily: "ui-monospace, SFMono-Regular, monospace" }} />
                  </div>
                </Flex>
              ),
            }]}
          />
        </Flex>
      </Paper>
    </ModalLayout>
  );
}
