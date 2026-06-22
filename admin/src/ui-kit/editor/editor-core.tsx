"use client";

import { useEffect, useRef, useCallback, memo, useId } from "react";
import EditorJS, { OutputData, API } from "@editorjs/editorjs";
import Paragraph from "@editorjs/paragraph";
import Header from "@editorjs/header";
import List from "@editorjs/list";
import Delimiter from "@editorjs/delimiter";
import { createStyles } from "antd-style";
import { safiro } from "@/fonts/safiro";
import { EditorGlobalStyles } from "./editor-global-styles";

const useStyles = createStyles(({ token }) => ({
  wrapper: {
    borderRadius: token.borderRadius,
    padding: "16px",
    transition: `border-color ${token.motionDurationMid}, box-shadow ${token.motionDurationMid}`,
    backgroundColor: token.colorBgContainer,
  },
}));

export interface EditorProps {
  value?: OutputData | null;
  onChange?: (data: OutputData | null) => void;
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: number;
  autofocus?: boolean;
  "data-testid"?: string;
}

const EditorCore = memo(function EditorCore({
  value,
  onChange,
  placeholder = "Start writing...",
  readOnly = false,
  minHeight = 100,
  autofocus = false,
  "data-testid": dataTestId,
}: EditorProps) {
  const { styles } = useStyles();
  const editorRef = useRef<EditorJS | null>(null);
  const holderId = useId().replace(/:/g, "-");
  const initializedRef = useRef(false);

  const handleChange = useCallback(
    async (api: API) => {
      if (!onChange) return;
      const data = await api.saver.save();
      onChange(data.blocks?.length ? data : null);
    },
    [onChange],
  );

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const editor = new EditorJS({
      holder: holderId,
      data: value || undefined,
      placeholder,
      readOnly,
      autofocus,
      minHeight: 0,
      tools: {
        paragraph: {
          class: Paragraph,
          inlineToolbar: true,
        },
        header: {
          class: Header,
          config: {
            levels: [2, 3, 4],
            defaultLevel: 2,
          },
          inlineToolbar: true,
        },
        list: {
          class: List,
          inlineToolbar: true,
          config: {
            defaultStyle: "unordered",
          },
        },
        delimiter: Delimiter,
      },
      onChange: handleChange,
    });

    editorRef.current = editor;

    return () => {
      if (editorRef.current?.destroy) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [holderId]);

  return (
    <>
      <EditorGlobalStyles />
      <div className={styles.wrapper} data-testid={dataTestId}>
        <div id={holderId} className={safiro.className} style={{ minHeight }} />
      </div>
    </>
  );
});

export default EditorCore;
