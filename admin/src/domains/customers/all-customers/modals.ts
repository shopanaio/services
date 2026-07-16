import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";
import type { CustomerAddressDraft, CustomerTaxExemptionDraft, CustomerTaxIdentifierDraft } from "./modals/shared/customer-drafts";

export const CUSTOMER_MODAL_TYPE = "customer";
export const CUSTOMER_CREATE_MODAL_TYPE = "customer-create";
export const CUSTOMER_EDIT_PROFILE_MODAL_TYPE = "customer-edit-profile";
export const CUSTOMER_EDIT_CONTACT_MODAL_TYPE = "customer-edit-contact";
export const CUSTOMER_EDIT_COMPANY_MODAL_TYPE = "customer-edit-company";
export const CUSTOMER_MANAGE_ADDRESSES_MODAL_TYPE = "customer-manage-addresses";
export const CUSTOMER_EDIT_ADDRESS_MODAL_TYPE = "customer-edit-address";
export const CUSTOMER_EDIT_CONSENTS_MODAL_TYPE = "customer-edit-consents";
export const CUSTOMER_EDIT_GROUPS_MODAL_TYPE = "customer-edit-groups";
export const CUSTOMER_EDIT_TAGS_MODAL_TYPE = "customer-edit-tags";
export const CUSTOMER_EDIT_SEGMENTS_MODAL_TYPE = "customer-edit-segments";
export const CUSTOMER_EDIT_STATUS_MODAL_TYPE = "customer-edit-status";
export const CUSTOMER_EDIT_NOTE_MODAL_TYPE = "customer-edit-note";
export const CUSTOMER_EDIT_MODERATION_MODAL_TYPE = "customer-edit-moderation";
export const CUSTOMER_MANAGE_TAX_IDENTIFIERS_MODAL_TYPE = "customer-manage-tax-identifiers";
export const CUSTOMER_EDIT_TAX_IDENTIFIER_MODAL_TYPE = "customer-edit-tax-identifier";
export const CUSTOMER_MANAGE_TAX_EXEMPTIONS_MODAL_TYPE = "customer-manage-tax-exemptions";
export const CUSTOMER_EDIT_TAX_EXEMPTION_MODAL_TYPE = "customer-edit-tax-exemption";
export const CUSTOMER_TECHNICAL_METADATA_MODAL_TYPE = "customer-technical-metadata";

export interface CustomerModalPayload extends IModalStackPayload { entityId: string; onSaved?: () => Promise<unknown> | unknown; }
export interface CustomerCreateModalPayload extends IModalStackPayload { onCreated?: (customerId: string) => Promise<unknown> | unknown; }
export interface CustomerSectionModalPayload extends IModalStackPayload { entityId: string; onSaved?: () => Promise<unknown> | unknown; }
export interface CustomerAddressItemModalPayload extends IModalStackPayload { item: CustomerAddressDraft; title: string; onApply: (item: CustomerAddressDraft) => void; }
export interface CustomerTaxIdentifierItemModalPayload extends IModalStackPayload { item: CustomerTaxIdentifierDraft; title: string; onApply: (item: CustomerTaxIdentifierDraft) => void; }
export interface CustomerTaxExemptionItemModalPayload extends IModalStackPayload { item: CustomerTaxExemptionDraft; title: string; onApply: (item: CustomerTaxExemptionDraft) => void; }

export type CustomerEditSection = "profile" | "contact" | "company" | "addresses" | "consents" | "groups" | "tags" | "segments" | "status" | "note" | "moderation" | "taxIdentifiers" | "taxExemptions";

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [CUSTOMER_MODAL_TYPE]: CustomerModalPayload;
    [CUSTOMER_CREATE_MODAL_TYPE]: CustomerCreateModalPayload;
    [CUSTOMER_EDIT_PROFILE_MODAL_TYPE]: CustomerSectionModalPayload;
    [CUSTOMER_EDIT_CONTACT_MODAL_TYPE]: CustomerSectionModalPayload;
    [CUSTOMER_EDIT_COMPANY_MODAL_TYPE]: CustomerSectionModalPayload;
    [CUSTOMER_MANAGE_ADDRESSES_MODAL_TYPE]: CustomerSectionModalPayload;
    [CUSTOMER_EDIT_ADDRESS_MODAL_TYPE]: CustomerAddressItemModalPayload;
    [CUSTOMER_EDIT_CONSENTS_MODAL_TYPE]: CustomerSectionModalPayload;
    [CUSTOMER_EDIT_GROUPS_MODAL_TYPE]: CustomerSectionModalPayload;
    [CUSTOMER_EDIT_TAGS_MODAL_TYPE]: CustomerSectionModalPayload;
    [CUSTOMER_EDIT_SEGMENTS_MODAL_TYPE]: CustomerSectionModalPayload;
    [CUSTOMER_EDIT_STATUS_MODAL_TYPE]: CustomerSectionModalPayload;
    [CUSTOMER_EDIT_NOTE_MODAL_TYPE]: CustomerSectionModalPayload;
    [CUSTOMER_EDIT_MODERATION_MODAL_TYPE]: CustomerSectionModalPayload;
    [CUSTOMER_MANAGE_TAX_IDENTIFIERS_MODAL_TYPE]: CustomerSectionModalPayload;
    [CUSTOMER_EDIT_TAX_IDENTIFIER_MODAL_TYPE]: CustomerTaxIdentifierItemModalPayload;
    [CUSTOMER_MANAGE_TAX_EXEMPTIONS_MODAL_TYPE]: CustomerSectionModalPayload;
    [CUSTOMER_EDIT_TAX_EXEMPTION_MODAL_TYPE]: CustomerTaxExemptionItemModalPayload;
    [CUSTOMER_TECHNICAL_METADATA_MODAL_TYPE]: CustomerSectionModalPayload;
  }
}

export const useCustomerModal = createModalStackHook(CUSTOMER_MODAL_TYPE);
export const useCustomerCreateModal = createModalStackHook(CUSTOMER_CREATE_MODAL_TYPE);
export const useCustomerEditProfileModal = createModalStackHook(CUSTOMER_EDIT_PROFILE_MODAL_TYPE);
export const useCustomerEditContactModal = createModalStackHook(CUSTOMER_EDIT_CONTACT_MODAL_TYPE);
export const useCustomerEditCompanyModal = createModalStackHook(CUSTOMER_EDIT_COMPANY_MODAL_TYPE);
export const useCustomerManageAddressesModal = createModalStackHook(CUSTOMER_MANAGE_ADDRESSES_MODAL_TYPE);
export const useCustomerEditAddressModal = createModalStackHook(CUSTOMER_EDIT_ADDRESS_MODAL_TYPE);
export const useCustomerEditConsentsModal = createModalStackHook(CUSTOMER_EDIT_CONSENTS_MODAL_TYPE);
export const useCustomerEditGroupsModal = createModalStackHook(CUSTOMER_EDIT_GROUPS_MODAL_TYPE);
export const useCustomerEditTagsModal = createModalStackHook(CUSTOMER_EDIT_TAGS_MODAL_TYPE);
export const useCustomerEditSegmentsModal = createModalStackHook(CUSTOMER_EDIT_SEGMENTS_MODAL_TYPE);
export const useCustomerEditStatusModal = createModalStackHook(CUSTOMER_EDIT_STATUS_MODAL_TYPE);
export const useCustomerEditNoteModal = createModalStackHook(CUSTOMER_EDIT_NOTE_MODAL_TYPE);
export const useCustomerEditModerationModal = createModalStackHook(CUSTOMER_EDIT_MODERATION_MODAL_TYPE);
export const useCustomerManageTaxIdentifiersModal = createModalStackHook(CUSTOMER_MANAGE_TAX_IDENTIFIERS_MODAL_TYPE);
export const useCustomerEditTaxIdentifierModal = createModalStackHook(CUSTOMER_EDIT_TAX_IDENTIFIER_MODAL_TYPE);
export const useCustomerManageTaxExemptionsModal = createModalStackHook(CUSTOMER_MANAGE_TAX_EXEMPTIONS_MODAL_TYPE);
export const useCustomerEditTaxExemptionModal = createModalStackHook(CUSTOMER_EDIT_TAX_EXEMPTION_MODAL_TYPE);
export const useCustomerTechnicalMetadataModal = createModalStackHook(CUSTOMER_TECHNICAL_METADATA_MODAL_TYPE);
