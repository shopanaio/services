import { LuPencil as EditOutlined, LuMail as MailOutlined, LuPhone as PhoneOutlined, LuStore as ShopOutlined } from "react-icons/lu";
import { Button, Flex } from "antd";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useEditStoreInformationModal } from "../modals";
import type { GeneralSettingsStore } from "../types";
import { SettingValue } from "./setting-value";

interface StoreInformationProps {
  store: GeneralSettingsStore;
  onSaved: () => Promise<unknown>;
}

export const StoreInformation = ({
  store,
  onSaved,
}: StoreInformationProps) => {
  const editModal = useEditStoreInformationModal();

  return (
    <Paper data-testid="information-settings-section">
      <PaperHeader
        title="Information"
        actions={
          <Button
            aria-label="Edit store information"
            data-testid="edit-store-information-button"
            icon={<EditOutlined />}
            onClick={() =>
              editModal.push({
                storeId: store.id,
                expectedRevision: store.revision,
                organizationId: store.organizationId,
                storeName: store.name,
                displayName: store.displayName,
                email: store.email ?? null,
                phoneNumbers: store.phoneNumber ? [store.phoneNumber] : [],
                onSaved,
              })
            }
            size="small"
            type="text"
          />
        }
      />
      <Flex vertical gap={16}>
        <SettingValue
          icon={<ShopOutlined />}
          label="Name"
          value={store.displayName}
        />
        <SettingValue
          icon={<PhoneOutlined />}
          label="Phone number"
          value={store.phoneNumber || "No phone number"}
        />
        <SettingValue
          icon={<MailOutlined />}
          label="Email"
          value={store.email || "No email"}
        />
      </Flex>
    </Paper>
  );
};
