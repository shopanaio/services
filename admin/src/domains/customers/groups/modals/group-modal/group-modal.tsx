"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, App, Button, Checkbox, Descriptions, Empty, Flex, Input, Select, Skeleton, Tag, Typography } from "antd";
import { LuTrash2 as DeleteOutlined, LuUsers as TeamOutlined } from "react-icons/lu";
import { createStyles } from "antd-style";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useEntityPicker } from "@/shared/components/entity-picker-modal";
import type { IPickableEntity } from "@/shared/components/entity-picker-modal/types";
import "@/domains/customers/all-customers/picker/customer-picker-config";
import { useCustomerGroup, useCustomerGroupMutations } from "../../hooks";
import type { CustomerGroupModalPayload } from "../../modals";

const useStyles = createStyles(({ token }) => ({ fields: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: token.padding }, full: { gridColumn: "1 / -1" }, label: { display: "block", marginBottom: 6, fontWeight: 500 } }));

export function CustomerGroupModal() {
  const { styles } = useStyles();
  const { message, modal } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const value = payload as CustomerGroupModalPayload;
  const isEdit = value.mode === "edit";
  const query = useCustomerGroup(isEdit ? value.entityId : undefined);
  const mutations = useCustomerGroupMutations();
  const [definition, setDefinition] = useState({ code: "", name: "", description: "" });
  const [state, setState] = useState({ isDefault: false, isActive: true });
  const [customerIds, setCustomerIds] = useState<string[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<IPickableEntity[]>([]);
  const [primaryCustomerId, setPrimaryCustomerId] = useState<string | null>(null);
  const [dirty, setLocalDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const group = query.group;

  useEffect(() => {
    if (!group) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate the edit draft when the requested group arrives.
    setDefinition({ code: group.code, name: group.name, description: group.description ?? "" });
    setState({ isDefault: group.isDefault, isActive: group.isActive });
    const memberships = group.customerMemberships.edges.map((edge) => edge.node);
    setCustomerIds(memberships.map((item) => item.customer.id));
    setSelectedCustomers(memberships.map((item) => ({ id: item.customer.id, title: item.customer.displayName })));
    setPrimaryCustomerId(memberships.find((item) => item.isPrimary)?.customer.id ?? null);
    setLocalDirty(false);
  }, [group]);
  useEffect(() => setDirty(dirty), [dirty, setDirty]);
  const existing = useMemo(() => group?.customerMemberships.edges.map((edge) => edge.node) ?? [], [group]);
  const { openPicker } = useEntityPicker<IPickableEntity>({ entityType: "customer", selectionMode: "multi", initialSelection: customerIds, allowEmptySelection: true, onConfirm: (items, ids) => {
    const labels = new Map([...selectedCustomers, ...items].map((item) => [item.id, item]));
    setCustomerIds(ids);
    setSelectedCustomers(ids.map((id) => labels.get(id) ?? { id, title: id }));
    if (primaryCustomerId && !ids.includes(primaryCustomerId)) setPrimaryCustomerId(null);
    setLocalDirty(true);
  } });
  const customerOptions = selectedCustomers.map((item) => ({ value: item.id, label: item.title }));

  const save = async () => {
    setError(null);
    if (!definition.code.trim() || !definition.name.trim()) return setError("Code and name are required.");
    const result = !group ? await mutations.createGroup({ code: definition.code.trim(), name: definition.name.trim(), description: definition.description.trim() || null, ...state }) : await mutations.updateGroup(group.id, group.revision, {
      definition: { code: definition.code.trim(), name: definition.name.trim(), description: definition.description.trim() || null }, state,
      memberships: {
        create: customerIds.filter((id) => !existing.some((item) => item.customer.id === id)).map((customerId) => ({ customerId, isPrimary: customerId === primaryCustomerId })),
        update: existing.filter((item) => customerIds.includes(item.customer.id)).map((item) => ({ membershipId: item.id, isPrimary: item.customer.id === primaryCustomerId, expiresAt: item.expiresAt })),
        deleteIds: existing.filter((item) => !customerIds.includes(item.customer.id)).map((item) => item.id),
      },
    });
    if (!result.group || result.userErrors.length) return setError(result.userErrors.map((item) => item.message).join(" ") || "Unable to save group");
    await value.onSaved?.(); setDirty(false); message.success(group ? "Group updated" : "Group created"); forcePop();
  };

  const remove = async () => { if (!group) return; const confirmed = await modal.confirm({ title: "Delete customer group?", content: group.name, okText: "Delete", okButtonProps: { danger: true } }); if (!confirmed) return; const result = await mutations.deleteGroup({ id: group.id }); if (!result.deletedGroupId) return setError(result.userErrors.map((item) => item.message).join(" ") || "Unable to delete group"); await value.onSaved?.(); forcePop(); };

  if (isEdit && query.loading && !group) return <ModalLayout name="customer-group" headerProps={{ title: "Customer group", onClose: pop, submitButtonProps: null }}><Skeleton active /></ModalLayout>;
  return <ModalLayout name="customer-group" header={<ModalHeader title={group ? group.name : "New customer group"} onClose={pop} extra={group ? <Tag color={group.isActive ? "green" : undefined}>{group.isActive ? "Active" : "Inactive"}</Tag> : null} submitButtonProps={{ children: group ? "Save" : "Create", loading: mutations.loading, disabled: !dirty && !!group, onClick: save }} />}>
    <Flex vertical gap={12}>{query.error || mutations.error ? <Alert type="error" showIcon message={(query.error ?? mutations.error)?.message} /> : null}{error ? <Alert type="error" showIcon message={error} /> : null}
      <Paper><PaperHeader title="Definition" /> <div className={styles.fields}><div><label className={styles.label}>Code</label><Input value={definition.code} onChange={(e) => { setDefinition({ ...definition, code: e.target.value }); setLocalDirty(true); }} /></div><div><label className={styles.label}>Name</label><Input value={definition.name} onChange={(e) => { setDefinition({ ...definition, name: e.target.value }); setLocalDirty(true); }} /></div><div className={styles.full}><label className={styles.label}>Description</label><Input.TextArea rows={4} value={definition.description} onChange={(e) => { setDefinition({ ...definition, description: e.target.value }); setLocalDirty(true); }} /></div><Checkbox checked={state.isActive} onChange={(e) => { setState({ ...state, isActive: e.target.checked }); setLocalDirty(true); }}>Active</Checkbox><Checkbox checked={state.isDefault} onChange={(e) => { setState({ ...state, isDefault: e.target.checked }); setLocalDirty(true); }}>Default group</Checkbox></div></Paper>
      {group ? <Paper><PaperHeader title={`Customers (${customerIds.length})`} icon={<TeamOutlined />} actions={<Button size="small" onClick={openPicker}>Manage customers</Button>} />{customerIds.length ? <Flex vertical gap="middle"><Flex gap={4} wrap="wrap">{selectedCustomers.map((item) => <Tag key={item.id} color={item.id === primaryCustomerId ? "blue" : undefined}>{item.title}</Tag>)}</Flex><div><Typography.Text strong>Primary customer membership</Typography.Text><Select allowClear value={primaryCustomerId} options={customerOptions} onChange={(id) => { setPrimaryCustomerId(id ?? null); setLocalDirty(true); }} style={{ width: "100%", marginTop: 8 }} /></div></Flex> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No customers in this group" />}</Paper> : null}
      {group ? <Paper><PaperHeader title="Audit metadata" /><Descriptions items={[{ key: "id", label: "ID", children: group.id }, { key: "revision", label: "Revision", children: group.revision }, { key: "updated", label: "Updated", children: new Date(group.updatedAt).toLocaleString() }]} /><Button danger icon={<DeleteOutlined />} onClick={remove}>Delete group</Button></Paper> : null}
    </Flex>
  </ModalLayout>;
}
