"use client";

import { useMemo } from "react";
import { Alert, Form, Input, Modal, Select, Space, Tag, Typography } from "antd";
import type { ApiAppDefinition } from "@/graphql/types";
import {
  toConnectionCreateInput,
  type CreateConnectionFormValues,
} from "../mappers";

export function CreateConnectionModal(props: {
  open: boolean;
  apps: ApiAppDefinition[];
  loading: boolean;
  onCancel: () => void;
  onSubmit: (
    input: ReturnType<typeof toConnectionCreateInput>,
  ) => Promise<unknown>;
}) {
  const [form] = Form.useForm<CreateConnectionFormValues>();
  const installationId = Form.useWatch("installationId", form);
  const app = useMemo(
    () =>
      props.apps.find(
        (candidate) => candidate.installation?.id === installationId,
      ),
    [installationId, props.apps],
  );
  const eligibleApps = props.apps.filter(
    (candidate) =>
      candidate.installed &&
      candidate.installation?.status === "ACTIVE" &&
      candidate.salesChannelSpecifications.length > 0,
  );

  return (
    <Modal
      open={props.open}
      title="Add sales channel connection"
      okText="Create and connect"
      confirmLoading={props.loading}
      onCancel={props.onCancel}
      onOk={() =>
        form.validateFields().then((values) =>
          props.onSubmit(toConnectionCreateInput(values)).then(() => {
            form.resetFields();
            props.onCancel();
          }),
        )
      }
    >
      <Alert
        type="info"
        showIcon
        message="Installing an App does not connect a channel. Each external account is a separate connection."
        style={{ marginBottom: 16 }}
      />
      <Form form={form} layout="vertical">
        <Form.Item
          name="installationId"
          label="Installed App"
          rules={[{ required: true }]}
        >
          <Select
            options={eligibleApps.map((item) => ({
              value: item.installation!.id,
              label: item.displayName,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="specificationId"
          label="Channel specification"
          rules={[{ required: true }]}
        >
          <Select
            disabled={!app}
            options={(app?.salesChannelSpecifications ?? [])
              .filter((item) => item.id)
              .map((item) => ({
                value: item.id!,
                label: `${item.label} (${item.handle})`,
              }))}
          />
        </Form.Item>
        <Form.Item
          name="displayName"
          label="Connection name"
          rules={[{ required: true, whitespace: true }]}
        >
          <Input placeholder="Amazon US · seller-1" />
        </Form.Item>
        <Form.Item name="configuration" label="Non-secret configuration (JSON)">
          <Input.TextArea rows={5} placeholder='{"region":"US"}' />
        </Form.Item>
        {app ? (
          <Space direction="vertical">
            <Typography.Text type="secondary">Requested permissions</Typography.Text>
            <Space wrap>
              {app.permissions.map((permission) => (
                <Tag key={permission.scope}>{permission.scope}</Tag>
              ))}
            </Space>
          </Space>
        ) : null}
      </Form>
    </Modal>
  );
}
