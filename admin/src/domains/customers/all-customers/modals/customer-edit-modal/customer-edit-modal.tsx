"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Checkbox,
  Flex,
  Input,
  Select,
  Skeleton,
  Typography,
} from "antd";
import { LuTrash2 as DeleteOutlined, LuPlus as PlusOutlined } from "react-icons/lu";
import { createStyles } from "antd-style";
import { shopCountries, shopLocales } from "@/defs/localization";
import type { ApiCustomer, ApiCustomerUpdateInput } from "@/graphql/types";
import {
  CustomerAdminLifecycleStatus,
  CustomerConsentAdminState,
  CustomerConsentChannel,
  CustomerConsentOptInLevel,
  CustomerConsentState,
  CustomerLifecycleStatus,
  CustomerTaxExemptionStatus,
  CustomerTaxIdentifierStatus,
} from "@/graphql/types";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useCustomer, useCustomerEditorContext, useUpdateCustomer } from "../../hooks";
import type { CustomerEditModalPayload, CustomerEditSection } from "../../modals";

const useStyles = createStyles(({ token }) => ({
  container: { display: "flex", flexDirection: "column", gap: token.padding },
  fields: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: token.padding },
  three: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: token.padding },
  full: { gridColumn: "1 / -1" },
  label: { display: "block", marginBottom: 6, fontWeight: 500 },
  row: { padding: token.padding, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG },
  muted: { color: token.colorTextSecondary },
}));

type ProfileDraft = {
  prefix: string; firstName: string; middleName: string; lastName: string; suffix: string;
  email: string; phoneE164: string; preferredLocale: string; dateOfBirth: string; gender: string;
};

type AddressDraft = {
  key: string; id?: string; label: string; firstName: string; lastName: string; companyName: string;
  phoneE164: string; address1: string; address2: string; city: string; regionName: string;
  regionCode: string; postalCode: string; countryCode: string; isDefaultShipping: boolean; isDefaultBilling: boolean;
};

type ConsentDraft = {
  channel: CustomerConsentChannel; state: CustomerConsentAdminState; optInLevel: CustomerConsentOptInLevel; contactPoint: string;
};

type TaxIdentifierDraft = {
  key: string; id?: string; identifierType: string; countryCode: string; value: string;
  status: CustomerTaxIdentifierStatus; isPrimary: boolean; validFrom: string; validTo: string;
};

type TaxExemptionDraft = {
  key: string; id?: string; code: string; countryCode: string; regionCode: string; reason: string;
  status: CustomerTaxExemptionStatus; certificateFileId: string; validFrom: string; validTo: string;
};

const titles: Record<CustomerEditSection, string> = {
  profile: "Edit profile & contacts",
  company: "Edit company",
  status: "Change customer status",
  notes: "Edit notes & moderation",
  classification: "Edit classification",
  addresses: "Manage addresses",
  consents: "Edit marketing consents",
  tax: "Manage tax data",
};

const newKey = () => `new-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const clean = (value: string) => value.trim() || null;

function adminStatus(status: CustomerLifecycleStatus): CustomerAdminLifecycleStatus {
  if (status === CustomerLifecycleStatus.Blocked) return CustomerAdminLifecycleStatus.Blocked;
  if (status === CustomerLifecycleStatus.Disabled) return CustomerAdminLifecycleStatus.Disabled;
  return CustomerAdminLifecycleStatus.Active;
}

function editableConsentState(state: CustomerConsentState): CustomerConsentAdminState {
  if (state === CustomerConsentState.Pending) return CustomerConsentAdminState.Pending;
  if (state === CustomerConsentState.Subscribed) return CustomerConsentAdminState.Subscribed;
  if (state === CustomerConsentState.Unsubscribed) return CustomerConsentAdminState.Unsubscribed;
  return CustomerConsentAdminState.NotSubscribed;
}

function buildProfile(customer: ApiCustomer): ProfileDraft {
  return {
    prefix: customer.prefix ?? "", firstName: customer.firstName ?? "", middleName: customer.middleName ?? "",
    lastName: customer.lastName ?? "", suffix: customer.suffix ?? "", email: customer.email ?? "",
    phoneE164: customer.phoneE164 ?? "", preferredLocale: customer.preferredLocale ?? "en",
    dateOfBirth: customer.dateOfBirth ?? "", gender: customer.gender ?? "",
  };
}

function buildAddresses(customer: ApiCustomer): AddressDraft[] {
  return customer.addresses.edges.map(({ node }) => ({
    key: node.id, id: node.id, label: node.label ?? "", firstName: node.firstName ?? "", lastName: node.lastName ?? "",
    companyName: node.companyName ?? "", phoneE164: node.phoneE164 ?? "", address1: node.address1,
    address2: node.address2 ?? "", city: node.city, regionName: node.regionName ?? "", regionCode: node.regionCode ?? "",
    postalCode: node.postalCode ?? "", countryCode: node.countryCode, isDefaultShipping: node.isDefaultShipping,
    isDefaultBilling: node.isDefaultBilling,
  }));
}

function buildConsents(customer: ApiCustomer): ConsentDraft[] {
  const existing = new Map(customer.consents.map((consent) => [consent.channel, consent]));
  return Object.values(CustomerConsentChannel).map((channel) => {
    const consent = existing.get(channel);
    const fallback = channel === CustomerConsentChannel.Email ? customer.email ?? ""
      : channel === CustomerConsentChannel.Sms || channel === CustomerConsentChannel.Whatsapp ? customer.phoneE164 ?? "" : "";
    return {
      channel,
      state: consent ? editableConsentState(consent.state) : CustomerConsentAdminState.NotSubscribed,
      optInLevel: consent?.optInLevel ?? CustomerConsentOptInLevel.Unknown,
      contactPoint: consent?.contactPoint ?? fallback,
    };
  });
}

function buildTaxIdentifiers(customer: ApiCustomer): TaxIdentifierDraft[] {
  return customer.taxIdentifiers.edges.map(({ node }) => ({
    key: node.id, id: node.id, identifierType: node.identifierType, countryCode: node.countryCode ?? "", value: node.value,
    status: node.status, isPrimary: node.isPrimary, validFrom: node.validFrom ?? "", validTo: node.validTo ?? "",
  }));
}

function buildTaxExemptions(customer: ApiCustomer): TaxExemptionDraft[] {
  return customer.taxExemptions.edges.map(({ node }) => ({
    key: node.id, id: node.id, code: node.code, countryCode: node.countryCode ?? "", regionCode: node.regionCode ?? "",
    reason: node.reason ?? "", status: node.status, certificateFileId: node.certificateFileId ?? "",
    validFrom: node.validFrom ?? "", validTo: node.validTo ?? "",
  }));
}

export function CustomerEditModal() {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const typedPayload = payload as CustomerEditModalPayload;
  const query = useCustomer(typedPayload.entityId);
  const contextQuery = useCustomerEditorContext();
  const mutation = useUpdateCustomer();
  const [dirty, setLocalDirty] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileDraft | null>(null);
  const [company, setCompany] = useState({ companyName: "", jobTitle: "" });
  const [status, setStatus] = useState(CustomerAdminLifecycleStatus.Active);
  const [blockedReason, setBlockedReason] = useState("");
  const [notes, setNotes] = useState({ note: "", moderationNote: "" });
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [primaryGroupId, setPrimaryGroupId] = useState<string | null>(null);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [segmentIds, setSegmentIds] = useState<string[]>([]);
  const [addresses, setAddresses] = useState<AddressDraft[]>([]);
  const [consents, setConsents] = useState<ConsentDraft[]>([]);
  const [taxIdentifiers, setTaxIdentifiers] = useState<TaxIdentifierDraft[]>([]);
  const [taxExemptions, setTaxExemptions] = useState<TaxExemptionDraft[]>([]);

  const customer = query.customer;
  useEffect(() => {
    if (!customer) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate the section draft when the requested customer arrives.
    setProfile(buildProfile(customer));
    setCompany({ companyName: customer.companyName ?? "", jobTitle: customer.jobTitle ?? "" });
    setStatus(adminStatus(customer.lifecycleStatus));
    setBlockedReason(customer.blockedReason ?? "");
    setNotes({ note: customer.note ?? "", moderationNote: customer.moderationNote ?? "" });
    const memberships = customer.groupMemberships.edges.map((edge) => edge.node);
    setGroupIds(memberships.filter((item) => item.source === "MANUAL").map((item) => item.group.id));
    setPrimaryGroupId(memberships.find((item) => item.isPrimary)?.group.id ?? null);
    setTagIds(customer.tagAssignments.edges.map((edge) => edge.node.tag.id));
    setSegmentIds(customer.segmentMemberships.edges.filter((edge) => edge.node.source === "MANUAL").map((edge) => edge.node.segment.id));
    setAddresses(buildAddresses(customer));
    setConsents(buildConsents(customer));
    setTaxIdentifiers(buildTaxIdentifiers(customer));
    setTaxExemptions(buildTaxExemptions(customer));
    setLocalDirty(false);
  }, [customer]);

  useEffect(() => setDirty(dirty), [dirty, setDirty]);
  const change = useCallback(() => setLocalDirty(true), []);
  const options = contextQuery.context;
  const countryOptions = useMemo(() => shopCountries.map((country) => ({ value: country.value, label: country.name })), []);

  const buildOperations = (): ApiCustomerUpdateInput | null => {
    if (!customer || !profile) return null;
    switch (typedPayload.section) {
      case "profile": return {
        profile: {
          prefix: clean(profile.prefix), firstName: clean(profile.firstName), middleName: clean(profile.middleName),
          lastName: clean(profile.lastName), suffix: clean(profile.suffix), preferredLocale: profile.preferredLocale,
          dateOfBirth: clean(profile.dateOfBirth), gender: clean(profile.gender),
        },
        contact: { email: clean(profile.email), phoneE164: clean(profile.phoneE164) },
      };
      case "company": return { company: { companyName: clean(company.companyName), jobTitle: clean(company.jobTitle) } };
      case "status": return { status: { status, blockedReason: status === CustomerAdminLifecycleStatus.Blocked ? clean(blockedReason) : null } };
      case "notes": return { note: { note: clean(notes.note) }, moderation: { moderationNote: clean(notes.moderationNote) } };
      case "classification": return {
        groups: { memberships: groupIds.map((groupId) => ({ groupId, isPrimary: groupId === primaryGroupId })) },
        tags: { tagIds },
        segments: { segmentIds },
      };
      case "addresses": {
        const currentIds = new Set(addresses.flatMap((item) => item.id ? [item.id] : []));
        return { addresses: {
          create: addresses.filter((item) => !item.id).map((item) => ({
            label: clean(item.label), firstName: clean(item.firstName), lastName: clean(item.lastName), companyName: clean(item.companyName),
            phoneE164: clean(item.phoneE164), address1: item.address1.trim(), address2: clean(item.address2), city: item.city.trim(),
            regionName: clean(item.regionName), regionCode: clean(item.regionCode), postalCode: clean(item.postalCode), countryCode: item.countryCode,
            isDefaultShipping: item.isDefaultShipping, isDefaultBilling: item.isDefaultBilling,
          })),
          update: addresses.filter((item): item is AddressDraft & { id: string } => !!item.id).map((item) => ({ addressId: item.id, operations: {
            label: clean(item.label), firstName: clean(item.firstName), lastName: clean(item.lastName), companyName: clean(item.companyName),
            phoneE164: clean(item.phoneE164), address1: item.address1.trim(), address2: clean(item.address2), city: item.city.trim(),
            regionName: clean(item.regionName), regionCode: clean(item.regionCode), postalCode: clean(item.postalCode), countryCode: item.countryCode,
            isDefaultShipping: item.isDefaultShipping, isDefaultBilling: item.isDefaultBilling,
          }})),
          deleteIds: customer.addresses.edges.map((edge) => edge.node.id).filter((id) => !currentIds.has(id)),
        } };
      }
      case "consents": return { consents: { set: consents.filter((item) => item.contactPoint.trim()).map((item) => ({
        channel: item.channel, state: item.state, optInLevel: item.optInLevel, contactPoint: item.contactPoint.trim(),
      })) } };
      case "tax": {
        const identifierIds = new Set(taxIdentifiers.flatMap((item) => item.id ? [item.id] : []));
        const exemptionIds = new Set(taxExemptions.flatMap((item) => item.id ? [item.id] : []));
        return {
          taxIdentifiers: {
            create: taxIdentifiers.filter((item) => !item.id).map((item) => ({ identifierType: item.identifierType.trim(), countryCode: clean(item.countryCode), value: item.value.trim(), status: item.status, isPrimary: item.isPrimary, validFrom: clean(item.validFrom), validTo: clean(item.validTo) })),
            update: taxIdentifiers.filter((item): item is TaxIdentifierDraft & { id: string } => !!item.id).map((item) => ({ taxIdentifierId: item.id, operations: { identifierType: item.identifierType.trim(), countryCode: clean(item.countryCode), value: item.value.trim(), status: item.status, isPrimary: item.isPrimary, validFrom: clean(item.validFrom), validTo: clean(item.validTo) } })),
            deleteIds: customer.taxIdentifiers.edges.map((edge) => edge.node.id).filter((id) => !identifierIds.has(id)),
          },
          taxExemptions: {
            create: taxExemptions.filter((item) => !item.id).map((item) => ({ code: item.code.trim(), countryCode: clean(item.countryCode), regionCode: clean(item.regionCode), reason: clean(item.reason), status: item.status, certificateFileId: clean(item.certificateFileId), validFrom: clean(item.validFrom), validTo: clean(item.validTo) })),
            update: taxExemptions.filter((item): item is TaxExemptionDraft & { id: string } => !!item.id).map((item) => ({ taxExemptionId: item.id, operations: { code: item.code.trim(), countryCode: clean(item.countryCode), regionCode: clean(item.regionCode), reason: clean(item.reason), status: item.status, certificateFileId: clean(item.certificateFileId), validFrom: clean(item.validFrom), validTo: clean(item.validTo) } })),
            deleteIds: customer.taxExemptions.edges.map((edge) => edge.node.id).filter((id) => !exemptionIds.has(id)),
          },
        };
      }
    }
  };

  const submit = async () => {
    if (!customer) return;
    setGlobalError(null);
    const operations = buildOperations();
    if (!operations) return;
    if (typedPayload.section === "status" && status === CustomerAdminLifecycleStatus.Blocked && !blockedReason.trim()) {
      setGlobalError("A block reason is required.");
      return;
    }
    if (typedPayload.section === "addresses" && addresses.some((item) => !item.address1.trim() || !item.city.trim() || !item.countryCode)) {
      setGlobalError("Every address requires address, city, and country.");
      return;
    }
    if (typedPayload.section === "tax" && (taxIdentifiers.some((item) => !item.identifierType.trim() || !item.value.trim()) || taxExemptions.some((item) => !item.code.trim()))) {
      setGlobalError("Tax identifiers require type and value; exemptions require a code.");
      return;
    }
    const result = await mutation.updateCustomer(customer.id, customer.revision, operations);
    if (!result.customer || result.userErrors.length > 0) {
      setGlobalError(result.userErrors.map((item) => item.message).join(" ") || "Unable to update customer");
      return;
    }
    await typedPayload.onSaved?.();
    setDirty(false);
    message.success("Customer updated");
    forcePop();
  };

  const updateAddress = (key: string, patch: Partial<AddressDraft>) => { setAddresses((items) => items.map((item) => item.key === key ? { ...item, ...patch } : item)); change(); };
  const updateIdentifier = (key: string, patch: Partial<TaxIdentifierDraft>) => { setTaxIdentifiers((items) => items.map((item) => item.key === key ? { ...item, ...patch } : item)); change(); };
  const updateExemption = (key: string, patch: Partial<TaxExemptionDraft>) => { setTaxExemptions((items) => items.map((item) => item.key === key ? { ...item, ...patch } : item)); change(); };

  const renderSection = () => {
    if (!customer || !profile) return null;
    if (typedPayload.section === "profile") return <Paper><PaperHeader title="Profile & contacts" /><div className={styles.fields}>
      {(["prefix", "firstName", "middleName", "lastName", "suffix"] as const).map((field) => <div key={field}><label className={styles.label}>{field.replace(/([A-Z])/g, " $1")}</label><Input value={profile[field]} onChange={(event) => { setProfile({ ...profile, [field]: event.target.value }); change(); }} /></div>)}
      <div><label className={styles.label}>Email</label><Input type="email" value={profile.email} onChange={(event) => { setProfile({ ...profile, email: event.target.value }); change(); }} /></div>
      <div><label className={styles.label}>Phone</label><Input value={profile.phoneE164} onChange={(event) => { setProfile({ ...profile, phoneE164: event.target.value }); change(); }} /></div>
      <div><label className={styles.label}>Preferred locale</label><Select value={profile.preferredLocale} options={shopLocales.map((locale) => ({ value: locale.value, label: locale.name }))} onChange={(value) => { setProfile({ ...profile, preferredLocale: value }); change(); }} style={{ width: "100%" }} /></div>
      <div><label className={styles.label}>Date of birth</label><Input type="date" value={profile.dateOfBirth} onChange={(event) => { setProfile({ ...profile, dateOfBirth: event.target.value }); change(); }} /></div>
      <div><label className={styles.label}>Gender</label><Input value={profile.gender} onChange={(event) => { setProfile({ ...profile, gender: event.target.value }); change(); }} /></div>
    </div></Paper>;

    if (typedPayload.section === "company") return <Paper><PaperHeader title="Company" /><div className={styles.fields}><div><label className={styles.label}>Company name</label><Input value={company.companyName} onChange={(event) => { setCompany({ ...company, companyName: event.target.value }); change(); }} /></div><div><label className={styles.label}>Job title</label><Input value={company.jobTitle} onChange={(event) => { setCompany({ ...company, jobTitle: event.target.value }); change(); }} /></div></div></Paper>;

    if (typedPayload.section === "status") return <Paper><PaperHeader title="Lifecycle status" /><Flex vertical gap="middle"><Select value={status} onChange={(value) => { setStatus(value); change(); }} options={Object.values(CustomerAdminLifecycleStatus).map((value) => ({ value, label: value.toLowerCase() }))} />{status === CustomerAdminLifecycleStatus.Blocked ? <div><label className={styles.label}>Block reason</label><Input.TextArea value={blockedReason} onChange={(event) => { setBlockedReason(event.target.value); change(); }} rows={4} /></div> : null}</Flex></Paper>;

    if (typedPayload.section === "notes") return <Paper><PaperHeader title="Notes & moderation" /><Flex vertical gap="middle"><div><label className={styles.label}>Merchant note</label><Input.TextArea value={notes.note} onChange={(event) => { setNotes({ ...notes, note: event.target.value }); change(); }} rows={5} maxLength={2000} showCount /></div><div><label className={styles.label}>Moderation note</label><Input.TextArea value={notes.moderationNote} onChange={(event) => { setNotes({ ...notes, moderationNote: event.target.value }); change(); }} rows={5} maxLength={2000} showCount /></div></Flex></Paper>;

    if (typedPayload.section === "classification") return <Paper><PaperHeader title="Classification" /><Flex vertical gap="middle"><div><label className={styles.label}>Groups</label><Select mode="multiple" value={groupIds} options={options?.groups.map((item) => ({ value: item.id, label: item.name }))} onChange={(value) => { setGroupIds(value); if (primaryGroupId && !value.includes(primaryGroupId)) setPrimaryGroupId(null); change(); }} style={{ width: "100%" }} /></div><div><label className={styles.label}>Primary group</label><Select allowClear value={primaryGroupId} options={options?.groups.filter((item) => groupIds.includes(item.id)).map((item) => ({ value: item.id, label: item.name }))} onChange={(value) => { setPrimaryGroupId(value ?? null); change(); }} style={{ width: "100%" }} /></div><div><label className={styles.label}>Tags</label><Select mode="multiple" value={tagIds} options={options?.tags.map((item) => ({ value: item.id, label: item.name }))} onChange={(value) => { setTagIds(value); change(); }} style={{ width: "100%" }} /></div><div><label className={styles.label}>Manual segments</label><Select mode="multiple" value={segmentIds} options={options?.segments.map((item) => ({ value: item.id, label: item.name }))} onChange={(value) => { setSegmentIds(value); change(); }} style={{ width: "100%" }} /></div></Flex></Paper>;

    if (typedPayload.section === "addresses") return <Flex vertical gap="middle">{addresses.map((address, index) => <Paper key={address.key}><PaperHeader title={address.label || `Address ${index + 1}`} actions={<Button size="small" danger icon={<DeleteOutlined />} onClick={() => { setAddresses((items) => items.filter((item) => item.key !== address.key)); change(); }} />} /><div className={styles.fields}><div><label className={styles.label}>Label</label><Input value={address.label} onChange={(event) => updateAddress(address.key, { label: event.target.value })} /></div><div><label className={styles.label}>Company</label><Input value={address.companyName} onChange={(event) => updateAddress(address.key, { companyName: event.target.value })} /></div><div><label className={styles.label}>First name</label><Input value={address.firstName} onChange={(event) => updateAddress(address.key, { firstName: event.target.value })} /></div><div><label className={styles.label}>Last name</label><Input value={address.lastName} onChange={(event) => updateAddress(address.key, { lastName: event.target.value })} /></div><div><label className={styles.label}>Phone</label><Input value={address.phoneE164} onChange={(event) => updateAddress(address.key, { phoneE164: event.target.value })} /></div><div className={styles.full}><label className={styles.label}>Address</label><Input value={address.address1} onChange={(event) => updateAddress(address.key, { address1: event.target.value })} /></div><div className={styles.full}><label className={styles.label}>Address line 2</label><Input value={address.address2} onChange={(event) => updateAddress(address.key, { address2: event.target.value })} /></div><div><label className={styles.label}>City</label><Input value={address.city} onChange={(event) => updateAddress(address.key, { city: event.target.value })} /></div><div><label className={styles.label}>Region</label><Input value={address.regionName} onChange={(event) => updateAddress(address.key, { regionName: event.target.value })} /></div><div><label className={styles.label}>Region code</label><Input value={address.regionCode} onChange={(event) => updateAddress(address.key, { regionCode: event.target.value })} /></div><div><label className={styles.label}>Postal code</label><Input value={address.postalCode} onChange={(event) => updateAddress(address.key, { postalCode: event.target.value })} /></div><div><label className={styles.label}>Country</label><Select showSearch optionFilterProp="label" value={address.countryCode || undefined} options={countryOptions} onChange={(value) => updateAddress(address.key, { countryCode: value })} style={{ width: "100%" }} /></div><Flex gap="large" align="center"><Checkbox checked={address.isDefaultShipping} onChange={(event) => updateAddress(address.key, { isDefaultShipping: event.target.checked })}>Default shipping</Checkbox><Checkbox checked={address.isDefaultBilling} onChange={(event) => updateAddress(address.key, { isDefaultBilling: event.target.checked })}>Default billing</Checkbox></Flex></div></Paper>)}<Button type="dashed" icon={<PlusOutlined />} onClick={() => { setAddresses((items) => [...items, { key: newKey(), label: "", firstName: "", lastName: "", companyName: "", phoneE164: "", address1: "", address2: "", city: "", regionName: "", regionCode: "", postalCode: "", countryCode: "", isDefaultShipping: false, isDefaultBilling: false }]); change(); }}>Add address</Button></Flex>;

    if (typedPayload.section === "consents") return <Paper><PaperHeader title="Marketing consents" /><Flex vertical gap="middle">{consents.map((consent) => <div key={consent.channel} className={styles.row}><Typography.Text strong>{consent.channel}</Typography.Text><div className={styles.three} style={{ marginTop: 12 }}><div><label className={styles.label}>State</label><Select value={consent.state} options={Object.values(CustomerConsentAdminState).map((value) => ({ value, label: value.toLowerCase().replaceAll("_", " ") }))} onChange={(value) => { setConsents((items) => items.map((item) => item.channel === consent.channel ? { ...item, state: value } : item)); change(); }} style={{ width: "100%" }} /></div><div><label className={styles.label}>Opt-in</label><Select value={consent.optInLevel} options={Object.values(CustomerConsentOptInLevel).map((value) => ({ value, label: value.toLowerCase().replaceAll("_", " ") }))} onChange={(value) => { setConsents((items) => items.map((item) => item.channel === consent.channel ? { ...item, optInLevel: value } : item)); change(); }} style={{ width: "100%" }} /></div><div><label className={styles.label}>Contact point</label><Input value={consent.contactPoint} onChange={(event) => { setConsents((items) => items.map((item) => item.channel === consent.channel ? { ...item, contactPoint: event.target.value } : item)); change(); }} /></div></div></div>)}</Flex></Paper>;

    return <Flex vertical gap="middle"><Paper><PaperHeader title="Tax identifiers" />{taxIdentifiers.map((item, index) => <div key={item.key} className={styles.row} style={{ marginBottom: 12 }}><Flex justify="space-between"><Typography.Text strong>Identifier {index + 1}</Typography.Text><Button size="small" danger icon={<DeleteOutlined />} onClick={() => { setTaxIdentifiers((items) => items.filter((candidate) => candidate.key !== item.key)); change(); }} /></Flex><div className={styles.three} style={{ marginTop: 12 }}><div><label className={styles.label}>Type</label><Input value={item.identifierType} onChange={(event) => updateIdentifier(item.key, { identifierType: event.target.value })} /></div><div><label className={styles.label}>Value</label><Input value={item.value} onChange={(event) => updateIdentifier(item.key, { value: event.target.value })} /></div><div><label className={styles.label}>Country</label><Select allowClear value={item.countryCode || undefined} options={countryOptions} onChange={(value) => updateIdentifier(item.key, { countryCode: value ?? "" })} style={{ width: "100%" }} /></div><div><label className={styles.label}>Status</label><Select value={item.status} options={Object.values(CustomerTaxIdentifierStatus).map((value) => ({ value, label: value.toLowerCase() }))} onChange={(value) => updateIdentifier(item.key, { status: value })} style={{ width: "100%" }} /></div><div><label className={styles.label}>Valid from</label><Input type="date" value={item.validFrom} onChange={(event) => updateIdentifier(item.key, { validFrom: event.target.value })} /></div><div><label className={styles.label}>Valid to</label><Input type="date" value={item.validTo} onChange={(event) => updateIdentifier(item.key, { validTo: event.target.value })} /></div><Checkbox checked={item.isPrimary} onChange={(event) => updateIdentifier(item.key, { isPrimary: event.target.checked })}>Primary identifier</Checkbox></div></div>)}<Button type="dashed" icon={<PlusOutlined />} onClick={() => { setTaxIdentifiers((items) => [...items, { key: newKey(), identifierType: "", countryCode: "", value: "", status: CustomerTaxIdentifierStatus.Unverified, isPrimary: false, validFrom: "", validTo: "" }]); change(); }}>Add identifier</Button></Paper><Paper><PaperHeader title="Tax exemptions" />{taxExemptions.map((item, index) => <div key={item.key} className={styles.row} style={{ marginBottom: 12 }}><Flex justify="space-between"><Typography.Text strong>Exemption {index + 1}</Typography.Text><Button size="small" danger icon={<DeleteOutlined />} onClick={() => { setTaxExemptions((items) => items.filter((candidate) => candidate.key !== item.key)); change(); }} /></Flex><div className={styles.three} style={{ marginTop: 12 }}><div><label className={styles.label}>Code</label><Input value={item.code} onChange={(event) => updateExemption(item.key, { code: event.target.value })} /></div><div><label className={styles.label}>Country</label><Select allowClear value={item.countryCode || undefined} options={countryOptions} onChange={(value) => updateExemption(item.key, { countryCode: value ?? "" })} style={{ width: "100%" }} /></div><div><label className={styles.label}>Region code</label><Input value={item.regionCode} onChange={(event) => updateExemption(item.key, { regionCode: event.target.value })} /></div><div><label className={styles.label}>Status</label><Select value={item.status} options={Object.values(CustomerTaxExemptionStatus).map((value) => ({ value, label: value.toLowerCase() }))} onChange={(value) => updateExemption(item.key, { status: value })} style={{ width: "100%" }} /></div><div><label className={styles.label}>Valid from</label><Input type="date" value={item.validFrom} onChange={(event) => updateExemption(item.key, { validFrom: event.target.value })} /></div><div><label className={styles.label}>Valid to</label><Input type="date" value={item.validTo} onChange={(event) => updateExemption(item.key, { validTo: event.target.value })} /></div><div className={styles.full}><label className={styles.label}>Reason</label><Input.TextArea value={item.reason} onChange={(event) => updateExemption(item.key, { reason: event.target.value })} rows={3} /></div><div className={styles.full}><label className={styles.label}>Certificate file ID</label><Input value={item.certificateFileId} onChange={(event) => updateExemption(item.key, { certificateFileId: event.target.value })} /></div></div></div>)}<Button type="dashed" icon={<PlusOutlined />} onClick={() => { setTaxExemptions((items) => [...items, { key: newKey(), code: "", countryCode: "", regionCode: "", reason: "", status: CustomerTaxExemptionStatus.Active, certificateFileId: "", validFrom: "", validTo: "" }]); change(); }}>Add exemption</Button></Paper></Flex>;
  };

  const loading = query.loading || contextQuery.loading;
  const transportError = query.error ?? contextQuery.error ?? mutation.error;
  return (
    <ModalLayout name="customer-edit" header={<ModalHeader name="customer-edit" title={titles[typedPayload.section]} onClose={pop} submitButtonProps={{ children: "Save", loading: mutation.loading, disabled: loading || mutation.loading || !dirty, onClick: submit }} />}>
      <div className={styles.container}>
        {transportError ? <Alert type="error" showIcon message={transportError.message} /> : null}
        {globalError ? <Alert type="error" showIcon message={globalError} /> : null}
        {loading && !customer ? <Skeleton active paragraph={{ rows: 10 }} /> : renderSection()}
      </div>
    </ModalLayout>
  );
}
