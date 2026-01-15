"use client";

import { BlockEditor, type BlockEditorProps } from "@/ui-kit/block-editor";

export interface EditorProps extends Omit<BlockEditorProps, "value" | "onChange"> {
  value?: BlockEditorProps["value"] | null;
  onChange?: (value: BlockEditorProps["value"] | null) => void;
}

export const Editor = ({
  value,
  onChange,
  placeholder = "Start writing...",
  minHeight = 100,
  ...props
}: EditorProps) => {
  return (
    <BlockEditor
      value={value || undefined}
      onChange={(data) => onChange?.(data.blocks?.length ? data : null)}
      placeholder={placeholder}
      minHeight={minHeight}
      {...props}
    />
  );
};
