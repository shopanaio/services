"use client";

import { useEffect } from "react";
import { Form, Input } from "antd";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { IProductEditTitleModalPayload } from "../modals";

interface IEditTitleForm {
  title: string;
  handle: string;
}

export const EditTitleModal = () => {
  const { payload, pop } =
    useModalStackContext<IProductEditTitleModalPayload>();

  const [form] = Form.useForm<IEditTitleForm>();

  useEffect(() => {
    form.setFieldsValue({
      title: payload.title || "",
      handle: payload.handle || "",
    });
  }, [form, payload.title, payload.handle]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        pop();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pop]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      payload.onSave?.(values);
      pop();
    } catch {
      // validation failed
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    const handle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    form.setFieldsValue({ handle });
  };

  return (
    <ModalLayout
      name="edit-title"
      header={
        <ModalHeader
          name="edit-title"
          title="Edit Title"
          onClose={pop}
          submitButtonProps={{
            onClick: handleSave,
          }}
        />
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="title"
          label="Title"
          rules={[{ required: true, message: "Title is required" }]}
        >
          <Input
            placeholder="Product title"
            onChange={handleTitleChange}
            autoFocus
          />
        </Form.Item>
        <Form.Item
          name="handle"
          label="Handle"
          rules={[{ required: true, message: "Handle is required" }]}
          extra="URL-friendly identifier for this product"
        >
          <Input placeholder="product-handle" addonBefore="/" />
        </Form.Item>
      </Form>
    </ModalLayout>
  );
};
