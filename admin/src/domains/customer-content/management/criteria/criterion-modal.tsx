"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, App, Button, Flex, Input, InputNumber, Select, Switch, Tag, Typography } from "antd";
import { LuTrash2 as DeleteOutlined, LuPlus as PlusOutlined, LuShoppingBag as ShoppingOutlined, LuTags as TagsOutlined } from "react-icons/lu";
import { ReviewRatingCriterionTargetType } from "@/graphql/types";
import { shopLocales } from "@/defs/localization";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useEntityPicker } from "@/shared/components/entity-picker-modal";
import type { IPickableEntity } from "@/shared/components/entity-picker-modal/types";
import "@/shared/components/entity-picker-modal/configs/product-picker-config";
import "@/shared/components/entity-picker-modal/configs/category-picker-config";
import { useManagementMutations } from "../hooks";
import type { RatingCriterionModalPayload } from "../modals";

type Translation = { locale: string; title: string; description: string };
type Assignment = { targetType: ReviewRatingCriterionTargetType; targetId: string; title: string; isRequiredOverride?: boolean | null; sortIndexOverride?: number | null };

export function RatingCriterionModal() {
  const { message } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const value = payload as RatingCriterionModalPayload; const current = value.criterion; const mutations = useManagementMutations();
  const [code, setCode] = useState(current?.code ?? ""); const [title, setTitle] = useState(current?.defaultTitle ?? "");
  const [description, setDescription] = useState(current?.defaultDescription ?? ""); const [weight, setWeight] = useState(current?.weight ?? 1);
  const [required, setRequired] = useState(current?.isRequired ?? false); const [active, setActive] = useState(current?.isActive ?? true);
  const [allProducts, setAllProducts] = useState(current?.appliesToAllProducts ?? true); const [sortIndex, setSortIndex] = useState(current?.sortIndex ?? 0);
  const [translations, setTranslations] = useState<Translation[]>(current?.translations.map((item) => ({ locale: item.locale, title: item.title, description: item.description ?? "" })) ?? []);
  const [assignments, setAssignments] = useState<Assignment[]>(current?.assignments.map((item) => ({ targetType: item.targetType, targetId: item.targetId, title: item.target.title, isRequiredOverride: item.isRequiredOverride, sortIndexOverride: item.sortIndexOverride })) ?? []);
  const [error, setError] = useState<string | null>(null); const [dirty, setLocalDirty] = useState(false);
  useEffect(() => setDirty(dirty), [dirty, setDirty]); const change = () => setLocalDirty(true);
  const products = useEntityPicker<IPickableEntity>({ entityType: "product", selectionMode: "multi", initialSelection: assignments.filter((item) => item.targetType === ReviewRatingCriterionTargetType.Product).map((item) => item.targetId), allowEmptySelection: true, onConfirm: (items) => { setAssignments((existing) => [...existing.filter((item) => item.targetType !== ReviewRatingCriterionTargetType.Product), ...items.map((item) => ({ targetType: ReviewRatingCriterionTargetType.Product, targetId: item.id, title: item.title }))]); change(); } });
  const categories = useEntityPicker<IPickableEntity>({ entityType: "category", selectionMode: "multi", initialSelection: assignments.filter((item) => item.targetType === ReviewRatingCriterionTargetType.Category).map((item) => item.targetId), allowEmptySelection: true, onConfirm: (items) => { setAssignments((existing) => [...existing.filter((item) => item.targetType !== ReviewRatingCriterionTargetType.Category), ...items.map((item) => ({ targetType: ReviewRatingCriterionTargetType.Category, targetId: item.id, title: item.title }))]); change(); } });
  const canSave = useMemo(() => code.trim().length > 0 && title.trim().length > 0 && weight >= 0, [code, title, weight]);
  const save = async () => {
    setError(null);
    const definition = { code: code.trim(), defaultTitle: title.trim(), defaultDescription: description.trim() || null, weight, isRequired: required, isActive: active, sortIndex };
    const translationInputs = translations.filter((item) => item.locale && item.title.trim()).map((item) => ({ locale: item.locale, title: item.title.trim(), description: item.description.trim() || null }));
    const assignmentInputs = allProducts ? [] : assignments.map(({ targetType, targetId, isRequiredOverride, sortIndexOverride }) => ({ targetType, targetId, isRequiredOverride, sortIndexOverride }));
    const result = current
      ? await mutations.updateCriterion(current.id, current.updatedAt, { definition, applicability: { appliesToAllProducts: allProducts }, translations: translationInputs, assignments: assignmentInputs })
      : await mutations.createCriterion({ ...definition, appliesToAllProducts: allProducts, translations: translationInputs, assignments: assignmentInputs });
    if (result.errors.length) return setError(result.errors.map((item) => item.message).join(" "));
    await value.onSaved?.(); setDirty(false); message.success(current ? "Criterion updated" : "Criterion created"); forcePop();
  };
  const remove = async () => {
    if (!current) return;
    const result = await mutations.deleteCriterion({ id: current.id, expectedUpdatedAt: current.updatedAt });
    if (result.errors.length) return setError(result.errors.map((item) => item.message).join(" "));
    await value.onSaved?.(); message.success("Criterion deleted"); forcePop();
  };
  const updateTranslation = (index: number, field: keyof Translation, next: string) => { setTranslations((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: next } : item)); change(); };
  return <ModalLayout name="rating-criterion" header={<ModalHeader name="rating-criterion" title={current ? current.defaultTitle : "New rating criterion"} onClose={pop} submitButtonProps={{ children: current ? "Save" : "Create", disabled: !canSave || (!!current && !dirty), loading: mutations.loading, onClick: save }} />}>
    {error ? <Alert type="error" showIcon message={error} /> : null}
    <Paper><PaperHeader title="Definition" /><Flex vertical gap="middle"><Flex gap="middle"><div style={{ flex: 1 }}><Typography.Text strong>Code *</Typography.Text><Input value={code} onChange={(event) => { setCode(event.target.value); change(); }} style={{ marginTop: 8 }} /></div><div style={{ flex: 2 }}><Typography.Text strong>Title *</Typography.Text><Input value={title} onChange={(event) => { setTitle(event.target.value); change(); }} style={{ marginTop: 8 }} /></div></Flex><div><Typography.Text strong>Description</Typography.Text><Input.TextArea value={description} onChange={(event) => { setDescription(event.target.value); change(); }} rows={3} style={{ marginTop: 8 }} /></div><Flex gap="large" wrap="wrap"><div><Typography.Text>Weight</Typography.Text><br /><InputNumber min={0} step={0.1} value={weight} onChange={(next) => { setWeight(next ?? 1); change(); }} /></div><div><Typography.Text>Sort index</Typography.Text><br /><InputNumber min={0} value={sortIndex} onChange={(next) => { setSortIndex(next ?? 0); change(); }} /></div><Flex align="center" gap="small"><Switch checked={required} onChange={(next) => { setRequired(next); change(); }} />Required</Flex><Flex align="center" gap="small"><Switch checked={active} onChange={(next) => { setActive(next); change(); }} />Active</Flex></Flex></Flex></Paper>
    <Paper><PaperHeader title="Translations" actions={<Button size="small" icon={<PlusOutlined />} onClick={() => { setTranslations((items) => [...items, { locale: "", title: "", description: "" }]); change(); }}>Add</Button>} /><Flex vertical gap="small">{translations.map((item, index) => <Flex key={`${item.locale}-${index}`} gap="small" align="flex-start"><Select value={item.locale || undefined} placeholder="Locale" options={shopLocales.map((locale) => ({ value: locale.value, label: locale.name }))} onChange={(next) => updateTranslation(index, "locale", next)} style={{ width: 150 }} /><Input value={item.title} placeholder="Title" onChange={(event) => updateTranslation(index, "title", event.target.value)} /><Input value={item.description} placeholder="Description" onChange={(event) => updateTranslation(index, "description", event.target.value)} /><Button danger type="text" icon={<DeleteOutlined />} onClick={() => { setTranslations((items) => items.filter((_, itemIndex) => itemIndex !== index)); change(); }} /></Flex>)}</Flex></Paper>
    <Paper><PaperHeader title="Applicability" /><Flex vertical gap="middle"><Flex align="center" gap="small"><Switch checked={allProducts} onChange={(next) => { setAllProducts(next); change(); }} />Apply to all products</Flex>{!allProducts ? <><Flex gap="small"><Button icon={<ShoppingOutlined />} onClick={products.openPicker}>Select products</Button><Button icon={<TagsOutlined />} onClick={categories.openPicker}>Select categories</Button></Flex><Flex gap="small" wrap="wrap">{assignments.map((item) => <Tag key={`${item.targetType}-${item.targetId}`}>{item.title} · {item.targetType.toLowerCase()}</Tag>)}</Flex></> : null}</Flex></Paper>
    {current ? <Paper><PaperHeader title="Danger zone" /><Button danger icon={<DeleteOutlined />} onClick={remove}>Delete criterion</Button></Paper> : null}
  </ModalLayout>;
}
