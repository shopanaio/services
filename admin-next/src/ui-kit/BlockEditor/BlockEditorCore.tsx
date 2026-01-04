"use client";

import { useEffect, useRef, useCallback, memo, useId } from "react";
import EditorJS, { OutputData, API } from "@editorjs/editorjs";
import Paragraph from "@editorjs/paragraph";
import Header from "@editorjs/header";
import List from "@editorjs/list";
import Quote from "@editorjs/quote";
import Delimiter from "@editorjs/delimiter";
import { createStyles } from "antd-style";
import { inter } from "@/fonts/inter";

const useStyles = createStyles(({ token }) => ({
  wrapper: {
    border: `1px solid ${token.colorBorder}`,
    borderRadius: token.borderRadius,
    padding: "12px 16px",
    transition: `border-color ${token.motionDurationMid}, box-shadow ${token.motionDurationMid}`,
    "&:focus-within": {
      borderColor: token.colorPrimary,
      boxShadow: `0 0 0 2px ${token.colorPrimaryBg}`,
    },
  },
  editor: {
    "& *": {
      fontFamily: "inherit !important",
    },
  },
}));

export interface BlockEditorProps {
  value?: OutputData;
  onChange?: (data: OutputData) => void;
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: number;
  autofocus?: boolean;
}

const BlockEditorCore = memo(function BlockEditorCore({
  value,
  onChange,
  placeholder = "Start writing...",
  readOnly = false,
  minHeight = 200,
  autofocus = false,
}: BlockEditorProps) {
  const { styles } = useStyles();
  const editorRef = useRef<EditorJS | null>(null);
  const holderId = useId().replace(/:/g, "-");
  const initializedRef = useRef(false);

  const handleChange = useCallback(
    async (api: API) => {
      if (!onChange) return;
      const data = await api.saver.save();
      onChange(data);
    },
    [onChange]
  );

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const editor = new EditorJS({
      holder: holderId,
      data: value,
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
        quote: {
          class: Quote,
          inlineToolbar: true,
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
    <div className={styles.wrapper}>
      <div id={holderId} className={`${inter.className} ${styles.editor}`} style={{ minHeight }} />
    </div>
  );
});

export default BlockEditorCore;
