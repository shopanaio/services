"use client";

import { useEffect, useState } from "react";
import { Button, Input, Typography } from "antd";
import type { AdminAppModalProps } from "@shopana/admin-app-sdk";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useHeadlessStorefrontActions } from "../hooks";
import type { RenameStorefrontModalPayload, RenameStorefrontModalResult } from ".";

export default function RenameStorefrontModal({
  sdk,
  payload,
}: AdminAppModalProps<RenameStorefrontModalPayload>) {
  const actions = useHeadlessStorefrontActions(sdk);
  const [displayName, setDisplayName] = useState(payload.displayName);
  const normalizedName = displayName.trim();
  const isDirty = normalizedName !== payload.displayName;
  const canSubmit = Boolean(normalizedName) && isDirty && !actions.loading;

  useEffect(() => {
    sdk.modals.setCurrentDirty(isDirty);
  }, [isDirty, sdk]);

  const submit = async () => {
    if (!canSubmit) return;

    try {
      await actions.renameStorefront(payload.storefrontId, normalizedName);
      sdk.modals.setCurrentDirty(false);
      sdk.modals.closeCurrent<RenameStorefrontModalResult>({
        displayName: normalizedName,
      });
    } catch (error) {
      sdk.notifications.error(
        "Unable to rename storefront",
        error instanceof Error ? error.message : undefined,
      );
    }
  };

  return (
    <sdk.ui.ModalLayout
      actions={
        <Button
          disabled={!canSubmit}
          loading={actions.loading}
          size="small"
          type="primary"
          onClick={() => void submit()}
        >
          Rename
        </Button>
      }
      title="Rename storefront"
    >
      <Paper>
        <PaperHeader title="Storefront name" />
        <Typography.Paragraph type="secondary">
          Change the name used to identify this storefront in Admin.
        </Typography.Paragraph>
        <Input
          autoFocus
          maxLength={255}
          value={displayName}
          onChange={({ target }) => setDisplayName(target.value)}
          onPressEnter={() => void submit()}
        />
      </Paper>
    </sdk.ui.ModalLayout>
  );
}
