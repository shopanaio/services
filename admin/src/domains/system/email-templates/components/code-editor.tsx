"use client";

import Editor from "@monaco-editor/react";
import { createStyles } from "antd-style";

const useStyles = createStyles(({ token }) => ({
  editor: {
    boxSizing: "border-box",
    minHeight: 200,
    height: "100%",
    border: `1px solid ${token.colorBorder}`,
    borderRadius: token.borderRadius,
    transition: `all ${token.motionDurationMid}`,
    position: "relative",
    outline: "2px solid transparent",
    overflow: "hidden",
    "&:focus-within": {
      outline: `2px solid ${token.colorPrimaryBorder}`,
      borderColor: token.colorPrimary,
    },
    "&:hover": {
      borderColor: token.colorBorder,
    },
  },
}));

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
  theme?: string;
  language?: string;
}

export const CodeEditor = ({
  onChange,
  value,
  height = "100%",
  theme = "vs-dark",
  language = "handlebars",
}: CodeEditorProps) => {
  const { styles } = useStyles();

  return (
    <div className={styles.editor}>
      <Editor
        height={height}
        language={language}
        onChange={(nextValue) => onChange(nextValue || "")}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wrappingIndent: "same",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          scrollbar: {
            vertical: "auto",
            horizontal: "hidden",
          },
        }}
        theme={theme}
        value={value}
      />
    </div>
  );
};
