"use client";
import { useEffect, useMemo, useState } from "react";
import { Alert, App, Button, Descriptions, Empty, Flex, Input, Skeleton, Tag } from "antd";
import { LuTrash2 as DeleteOutlined, LuTags as TagsOutlined, LuUsers as TeamOutlined } from "react-icons/lu";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useEntityPicker } from "@/shared/components/entity-picker-modal";
import type { IPickableEntity } from "@/shared/components/entity-picker-modal/types";
import "@/domains/customers/all-customers/picker/customer-picker-config";
import { useCustomerTag, useCustomerTagMutations } from "../../hooks";
import type { CustomerTagModalPayload } from "../../modals";

export function CustomerTagModal() {
  const { message, modal } = App.useApp(); const { payload, pop, forcePop, setDirty } = useModalStackContext(); const value = payload as CustomerTagModalPayload; const isEdit = value.mode === "edit"; const query = useCustomerTag(isEdit ? value.entityId : undefined); const mutations = useCustomerTagMutations(); const [name, setName] = useState(""); const [customerIds, setCustomerIds] = useState<string[]>([]); const [selectedCustomers, setSelectedCustomers] = useState<IPickableEntity[]>([]); const [dirty, setLocalDirty] = useState(false); const [error, setError] = useState<string | null>(null); const tag = query.tag;
  useEffect(() => {
    if (!tag) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate the edit draft when the requested tag arrives.
    setName(tag.name);
    setCustomerIds(tag.customerAssignments.edges.map((edge) => edge.node.customer.id));
    setSelectedCustomers(tag.customerAssignments.edges.map((edge) => ({ id: edge.node.customer.id, title: edge.node.customer.displayName })));
    setLocalDirty(false);
  }, [tag]);
  useEffect(() => setDirty(dirty), [dirty, setDirty]);
  const existing = useMemo(() => tag?.customerAssignments.edges.map((edge) => edge.node) ?? [], [tag]);
  const { openPicker } = useEntityPicker<IPickableEntity>({ entityType: "customer", selectionMode: "multi", initialSelection: customerIds, allowEmptySelection: true, onConfirm: (items, ids) => { const labels = new Map([...selectedCustomers, ...items].map((item) => [item.id, item])); setCustomerIds(ids); setSelectedCustomers(ids.map((id) => labels.get(id) ?? { id, title: id })); setLocalDirty(true); } });
  const save = async () => { setError(null); if (!name.trim()) return setError("Name is required."); const result = !tag ? await mutations.createTag({ name: name.trim() }) : await mutations.updateTag(tag.id, { name: name.trim(), assignments: { create: customerIds.filter((id) => !existing.some((item) => item.customer.id === id)).map((customerId) => ({ customerId })), deleteIds: existing.filter((item) => !customerIds.includes(item.customer.id)).map((item) => item.id) } }); if (!result.tag || result.userErrors.length) return setError(result.userErrors.map((item) => item.message).join(" ") || "Unable to save tag"); await value.onSaved?.(); setDirty(false); message.success(tag ? "Tag updated" : "Tag created"); forcePop(); };
  const remove = async () => { if (!tag) return; const confirmed = await modal.confirm({ title: "Delete customer tag?", content: tag.name, okText: "Delete", okButtonProps: { danger: true } }); if (!confirmed) return; const result = await mutations.deleteTag({ id: tag.id }); if (!result.deletedTagId) return setError(result.userErrors.map((item) => item.message).join(" ") || "Unable to delete tag"); await value.onSaved?.(); forcePop(); };
  if (isEdit && query.loading && !tag) return <ModalLayout name="customer-tag" headerProps={{ title: "Customer tag", onClose: pop, submitButtonProps: null }}><Skeleton active /></ModalLayout>;
  return <ModalLayout name="customer-tag" header={<ModalHeader title={tag ? tag.name : "New customer tag"} onClose={pop} submitButtonProps={{ children: tag ? "Save" : "Create", loading: mutations.loading, disabled: !!tag && !dirty, onClick: save }} />}><Flex vertical gap={12}>{query.error || mutations.error ? <Alert type="error" showIcon message={(query.error ?? mutations.error)?.message} /> : null}{error ? <Alert type="error" showIcon message={error} /> : null}<Paper><PaperHeader title="Tag" icon={<TagsOutlined />} /><label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Name</label><Input value={name} onChange={(event) => { setName(event.target.value); setLocalDirty(true); }} /></Paper>{tag ? <Paper><PaperHeader title={`Customers (${customerIds.length})`} icon={<TeamOutlined />} actions={<Button size="small" onClick={openPicker}>Manage customers</Button>} />{selectedCustomers.length ? <Flex gap={4} wrap="wrap">{selectedCustomers.map((item) => <Tag key={item.id}>{item.title}</Tag>)}</Flex> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No customers with this tag" />}</Paper> : null}{tag ? <Paper><PaperHeader title="Audit metadata" /><Descriptions items={[{ key: "normalized", label: "Normalized name", children: tag.normalizedName }, { key: "id", label: "ID", children: tag.id }, { key: "updated", label: "Updated", children: new Date(tag.updatedAt).toLocaleString() }]} /><Button danger icon={<DeleteOutlined />} onClick={remove}>Delete tag</Button></Paper> : null}</Flex></ModalLayout>;
}
