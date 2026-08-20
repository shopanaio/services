"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Checkbox, Flex, Input, Typography } from "antd";
import { createStyles } from "antd-style";
import type { AdminAppModalProps } from "@shopana/admin-app-sdk";
import { LuCopy } from "react-icons/lu";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useHeadlessStorefrontActions } from "../hooks";
import { groupStorefrontPermissions } from "../permissions";
import type { CreateStorefrontModalPayload, CreateStorefrontModalResult } from ".";

const useStyles = createStyles(({ token }) => ({
  permissions: {
    display: "grid",
    gap: `${token.padding}px ${token.paddingLG}px`,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    marginBottom: token.margin,
    [`@media (max-width: ${token.screenSM}px)`]: {
      gridTemplateColumns: "1fr",
    },
  },
  permissionGroup: {
    display: "flex",
    flexDirection: "column",
    gap: token.paddingXS,
  },
  permission: {
    display: "flex",
    flexDirection: "column",
    gap: token.paddingXXS,
  },
  permissionDescription: {
    paddingLeft: token.paddingLG,
  },
  credentialStack: {
    display: "flex",
    flexDirection: "column",
    gap: token.paddingSM,
  },
  credentialInput: {
    display: "flex",
    gap: token.paddingXS,
  },
  credentialField: {
    display: "flex",
    flexDirection: "column",
    gap: token.paddingXXS,
  },
  privateTokenWarning: {
    "&.ant-alert-with-description": {
      padding: token.paddingSM,
    },
  },
}));

function samePermissions(left: string[], right: string[]) {
  return left.length === right.length && left.every((permission) => right.includes(permission));
}

export default function CreateStorefrontModal({
  sdk,
  payload,
}: AdminAppModalProps<CreateStorefrontModalPayload>) {
  const { styles } = useStyles();
  const actions = useHeadlessStorefrontActions(sdk);
  const [displayName, setDisplayName] = useState("");
  const [permissions, setPermissions] = useState(payload.defaultPermissions);
  const [created, setCreated] = useState<{
    storefrontId: string;
    publicAccessToken: string;
    privateAccessToken: string;
  } | null>(null);
  const normalizedName = displayName.trim();
  const isDirty =
    Boolean(normalizedName) || !samePermissions(permissions, payload.defaultPermissions);
  const canSubmit = Boolean(normalizedName) && !actions.loading;
  const groupedPermissions = useMemo(
    () => groupStorefrontPermissions(payload.permissionCatalog),
    [payload.permissionCatalog],
  );

  useEffect(() => {
    sdk.modals.setCurrentDirty(Boolean(created) || isDirty);
  }, [created, isDirty, sdk]);

  const togglePermission = (handle: string, enabled: boolean) => {
    setPermissions((current) =>
      enabled
        ? [...new Set([...current, handle])]
        : current.filter((permission) => permission !== handle),
    );
  };

  const submit = async () => {
    if (!canSubmit) return;

    try {
      const result = await actions.createStorefront(normalizedName, permissions);
      if (!result.connection) {
        throw new Error("The storefront was not returned by the API.");
      }
      let privateAccessToken = result.initialStorefrontCredentials?.privateAccessToken ?? null;
      if (!privateAccessToken) {
        const credential = await actions.createPrivateCredential(
          result.connection.id,
          "Initial private access token",
        );
        privateAccessToken = credential.privateAccessToken;
      }
      if (!privateAccessToken) {
        throw new Error("The private access token was not returned by the API.");
      }
      setCreated({
        storefrontId: result.connection.id,
        publicAccessToken:
          result.initialStorefrontCredentials?.publicAccessToken ??
          result.connection.publicAccessToken ??
          "",
        privateAccessToken,
      });
    } catch (error) {
      sdk.notifications.error(
        "Unable to add storefront",
        error instanceof Error ? error.message : undefined,
      );
    }
  };

  const finish = () => {
    if (!created) return;
    sdk.modals.setCurrentDirty(false);
    sdk.modals.closeCurrent<CreateStorefrontModalResult>({
      storefrontId: created.storefrontId,
      privateAccessToken: created.privateAccessToken,
    });
  };

  const copyCredential = async (value: string, label: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      sdk.notifications.success(`${label} copied`);
    } catch (error) {
      sdk.notifications.error(
        `Unable to copy ${label.toLowerCase()}`,
        error instanceof Error ? error.message : undefined,
      );
    }
  };

  return (
    <sdk.ui.ModalLayout
      actions={
        created ? (
          <Button size="small" type="primary" onClick={finish}>
            I saved the token
          </Button>
        ) : (
          <Button
            disabled={!canSubmit}
            loading={actions.loading}
            size="small"
            type="primary"
            onClick={() => void submit()}
          >
            Add storefront
          </Button>
        )
      }
      title={created ? "Save private access token" : "Add storefront"}
    >
      <Paper>
        <PaperHeader title="Storefront connection" />
        <Typography.Paragraph type="secondary">
          Choose the name used to identify this storefront in Admin.
        </Typography.Paragraph>
        <Input
          autoFocus={!created}
          disabled={Boolean(created)}
          maxLength={255}
          placeholder="Storefront name"
          value={displayName}
          onChange={({ target }) => setDisplayName(target.value)}
        />
      </Paper>

      {created ? (
        <Paper>
          <PaperHeader title="Credentials" />
          <div className={styles.credentialStack}>
            <div className={styles.credentialField}>
              <Typography.Text strong>Public access token</Typography.Text>
              <div className={styles.credentialInput}>
                <Input readOnly value={created.publicAccessToken} />
                <Button
                  aria-label="Copy public access token"
                  disabled={!created.publicAccessToken}
                  icon={<LuCopy size={16} />}
                  onClick={() =>
                    void copyCredential(created.publicAccessToken, "Public access token")
                  }
                />
              </div>
            </div>
            <div className={styles.credentialField}>
              <Typography.Text strong>Private access token</Typography.Text>
              <div className={styles.credentialInput}>
                <Input readOnly value={created.privateAccessToken} />
                <Button
                  aria-label="Copy private access token"
                  icon={<LuCopy size={16} />}
                  onClick={() =>
                    void copyCredential(created.privateAccessToken, "Private access token")
                  }
                />
              </div>
            </div>
            <Alert
              className={styles.privateTokenWarning}
              description="Copy and save this token now. You won’t be able to view it again."
              type="warning"
            />
          </div>
        </Paper>
      ) : null}

      <Paper>
        <PaperHeader title="Permissions" />
        <Typography.Paragraph type="secondary">
          Choose which Storefront API resources this connection can access.
        </Typography.Paragraph>
        <div className={styles.permissions}>
          {groupedPermissions.map((group) => (
            <div className={styles.permissionGroup} key={group.label}>
              <Typography.Text strong>{group.label}</Typography.Text>
              {group.permissions.map((permission) => (
                <div className={styles.permission} key={permission.handle}>
                  <Checkbox
                    checked={permissions.includes(permission.handle)}
                    disabled={Boolean(created) || actions.loading}
                    onChange={({ target }) => togglePermission(permission.handle, target.checked)}
                  >
                    {permission.label}
                  </Checkbox>
                  <Typography.Text className={styles.permissionDescription} type="secondary">
                    {permission.description}
                  </Typography.Text>
                </div>
              ))}
            </div>
          ))}
        </div>
        <Flex justify="space-between">
          <Typography.Text type="secondary">
            {permissions.length} of {payload.permissionCatalog.length} permissions enabled
          </Typography.Text>
        </Flex>
      </Paper>
    </sdk.ui.ModalLayout>
  );
}
