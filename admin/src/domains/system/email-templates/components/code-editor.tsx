"use client";

import { html } from "@codemirror/lang-html";
import { json } from "@codemirror/lang-json";
import CodeMirror, {
  Decoration,
  EditorState,
  EditorView,
  MatchDecorator,
  type ReactCodeMirrorProps,
  type ViewUpdate,
  ViewPlugin,
} from "@uiw/react-codemirror";
import { theme as antdTheme } from "antd";
import { createStyles } from "antd-style";
import { useMemo } from "react";

const handlebarsMatcher = new MatchDecorator({
  regexp: /\{\{\{?.+?}\}\}?/g,
  decoration: Decoration.mark({ class: "cm-handlebars-expression" }),
});

const handlebarsHighlight = ViewPlugin.fromClass(
  class {
    decorations;

    constructor(view: EditorView) {
      this.decorations = handlebarsMatcher.createDeco(view);
    }

    update(update: ViewUpdate) {
      this.decorations = handlebarsMatcher.updateDeco(update, this.decorations);
    }
  },
  {
    decorations: (instance) => instance.decorations,
  },
);

const singleLine = EditorState.transactionFilter.of((transaction) =>
  transaction.newDoc.lines > 1 ? [] : transaction,
);

const useStyles = createStyles(({ token }) => ({
  editor: {
    boxSizing: "border-box",
    position: "relative",
    minHeight: 200,
    overflow: "hidden",
    border: `1px solid ${token.colorBorder}`,
    borderRadius: token.borderRadius,
    outline: "2px solid transparent",
    transition: `all ${token.motionDurationMid}`,
    "&:focus-within": {
      borderColor: token.colorPrimary,
      outline: `2px solid ${token.colorPrimaryBorder}`,
    },
    "&:hover": {
      borderColor: token.colorBorder,
    },
    "& > div": {
      height: "100%",
    },
  },
  borderless: {
    border: 0,
    borderRadius: 0,
    outline: 0,
    "&:focus-within": {
      borderColor: "transparent",
      outline: 0,
    },
    "&:hover": {
      borderColor: "transparent",
    },
  },
}));

export type CodeEditorLanguage = "handlebars" | "handlebars-inline" | "json";

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  bordered?: boolean;
  dataTestId?: string;
  fontSize?: number;
  height?: string;
  language?: CodeEditorLanguage;
  lineNumbers?: boolean;
  minHeight?: string;
  placeholder?: string;
  readOnly?: boolean;
  singleLine?: boolean;
  theme?: "light" | "dark";
  wordWrap?: boolean;
}

export const CodeEditor = ({
  onChange,
  value,
  ariaLabel,
  bordered = true,
  dataTestId,
  fontSize = 12,
  height = "100%",
  language = "handlebars",
  lineNumbers = true,
  minHeight = "200px",
  placeholder,
  readOnly = false,
  singleLine: isSingleLine = false,
  theme = "light",
  wordWrap = true,
}: CodeEditorProps) => {
  const { styles, cx } = useStyles();
  const { token } = antdTheme.useToken();

  const extensions = useMemo(() => {
    const languageExtensions =
      language === "json"
        ? [json()]
        : language === "handlebars"
          ? [html(), handlebarsHighlight]
          : [handlebarsHighlight];
    const appearance = EditorView.theme(
      {
        "&": {
          height: "100%",
          color: theme === "dark" ? "#d4d4d4" : token.colorText,
          backgroundColor: theme === "dark" ? "#1e1e1e" : token.colorBgContainer,
          fontSize: `${fontSize}px`,
        },
        "&.cm-focused": {
          outline: "none",
        },
        ".cm-scroller": {
          overflow: "auto",
          fontFamily: token.fontFamilyCode,
          lineHeight: "20px",
        },
        ".cm-content": {
          minHeight: isSingleLine ? "32px" : "100%",
          padding: isSingleLine ? "6px 0" : "10px 0",
          caretColor: token.colorPrimary,
        },
        ".cm-line": {
          paddingInline: lineNumbers ? "6px" : "10px",
        },
        ".cm-gutters": {
          color: token.colorTextQuaternary,
          backgroundColor: token.colorFillQuaternary,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
        },
        ".cm-activeLine, .cm-activeLineGutter": {
          backgroundColor: "transparent",
        },
        ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
          backgroundColor: `${token.colorPrimaryBgHover} !important`,
        },
        ".cm-handlebars-expression": {
          color: token.colorPrimaryText,
          fontWeight: "600",
          backgroundColor: token.colorPrimaryBg,
          borderRadius: "3px",
        },
        ".cm-placeholder": {
          color: token.colorTextPlaceholder,
        },
      },
      { dark: theme === "dark" },
    );
    const result = [...languageExtensions, appearance];

    if (wordWrap) result.push(EditorView.lineWrapping);
    if (isSingleLine) result.push(singleLine);
    if (ariaLabel) {
      result.push(
        EditorView.contentAttributes.of({
          "aria-label": ariaLabel,
        }),
      );
    }

    return result;
  }, [ariaLabel, fontSize, isSingleLine, language, lineNumbers, theme, token, wordWrap]);

  const basicSetup: ReactCodeMirrorProps["basicSetup"] = {
    autocompletion: false,
    bracketMatching: !isSingleLine,
    closeBrackets: !isSingleLine,
    foldGutter: lineNumbers,
    highlightActiveLine: false,
    highlightActiveLineGutter: false,
    lineNumbers,
  };

  return (
    <div
      className={cx(styles.editor, !bordered && styles.borderless)}
      data-testid={dataTestId}
      style={{ height, minHeight }}
    >
      <CodeMirror
        basicSetup={basicSetup}
        editable={!readOnly}
        extensions={extensions}
        height="100%"
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        theme="none"
        value={value}
      />
    </div>
  );
};
