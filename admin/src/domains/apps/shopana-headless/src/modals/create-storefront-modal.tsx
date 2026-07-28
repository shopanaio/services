"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, Flex, Input, Typography } from "antd";
import { createStyles } from "antd-style";
import type { AdminAppModalProps } from "@shopana/admin-app-sdk";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useHeadlessStorefrontActions } from "../hooks";
import { groupStorefrontPermissions } from "../permissions";
import type {
  CreateStorefrontModalPayload,
  CreateStorefrontModalResult,
} from ".";

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
}));

function samePermissions(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((permission) => right.includes(permission))
  );
}

export default function CreateStorefrontModal({
  sdk,
  payload,
}: AdminAppModalProps<CreateStorefrontModalPayload>) {
  const { styles } = useStyles();
  const actions = useHeadlessStorefrontActions(sdk);
  const [displayName, setDisplayName] = useState("");
  const [permissions, setPermissions] = useState(payload.defaultPermissions);
  const normalizedName = displayName.trim();
  const isDirty =
    Boolean(normalizedName) ||
    !samePermissions(permissions, payload.defaultPermissions);
  const canSubmit = Boolean(normalizedName) && !actions.loading;
  const groupedPermissions = useMemo(
    () => groupStorefrontPermissions(payload.permissionCatalog),
    [payload.permissionCatalog],
  );

  useEffect(() => {
    sdk.modals.setCurrentDirty(isDirty);
  }, [isDirty, sdk]);

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
      const result = await actions.createStorefront(
        normalizedName,
        permissions,
      );
      if (!result.connection) {
        throw new Error("The storefront was not returned by the API.");
      }
      sdk.modals.setCurrentDirty(false);
      sdk.modals.closeCurrent<CreateStorefrontModalResult>({
        storefrontId: result.connection.id,
        privateAccessToken:
          result.initialStorefrontCredentials?.privateAccessToken ?? null,
      });
    } catch (error) {
      sdk.notifications.error(
        "Unable to add storefront",
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
          Add storefront
        </Button>
      }
      title="Add storefront"
    >
      <Paper>
        <PaperHeader title="Storefront connection" />
        <Typography.Paragraph type="secondary">
          Choose the name used to identify this storefront in Admin.
        </Typography.Paragraph>
        <Input
          autoFocus
          maxLength={255}
          placeholder="Storefront name"
          value={displayName}
          onChange={({ target }) => setDisplayName(target.value)}
        />
      </Paper>

      <Paper>
        <PaperHeader
          description="Choose which Storefront API resources this connection can access."
          title="Permissions"
        />
        <div className={styles.permissions}>
          {groupedPermissions.map((group) => (
            <div className={styles.permissionGroup} key={group.label}>
              <Typography.Text strong>{group.label}</Typography.Text>
              {group.permissions.map((permission) => (
                <div className={styles.permission} key={permission.handle}>
                  <Checkbox
                    checked={permissions.includes(permission.handle)}
                    disabled={actions.loading}
                    onChange={({ target }) =>
                      togglePermission(
                        permission.handle,
                        target.checked,
                      )
                    }
                  >
                    {permission.label}
                  </Checkbox>
                  <Typography.Text
                    className={styles.permissionDescription}
                    type="secondary"
                  >
                    {permission.description}
                  </Typography.Text>
                </div>
              ))}
            </div>
          ))}
        </div>
        <Flex justify="space-between">
          <Typography.Text type="secondary">
            {permissions.length} of {payload.permissionCatalog.length}{" "}
            permissions enabled
          </Typography.Text>
        </Flex>
      </Paper>
    </sdk.ui.ModalLayout>
  );
}
