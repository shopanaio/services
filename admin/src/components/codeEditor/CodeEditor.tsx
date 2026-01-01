import { css } from '@emotion/react';
import Editor from '@monaco-editor/react';

const s = {
  editor: css`
    --border-color: var(--color-gray-3);

    box-sizing: border-box;
    min-height: 200px;
    height: 100%;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-base);
    transition: all 0.3s ease;
    position: relative;
    outline: 2px solid transparent;
    overflow: hidden;

    &:focus-within {
      outline: 2px solid var(--color-gray-4);
      border-color: var(--color-primary-10);
    }

    &:hover {
      border-color: var(--color-border);
    }
  `,
};
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
  height = '100%',
  theme = 'vs-dark',
  language = 'handlebars',
}: CodeEditorProps) => {
  return (
    <div css={s.editor}>
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={(value) => onChange(value || '')}
        theme={theme}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          // wordWrap: 'on',
          // lineNumbers: 'off',
          wrappingIndent: 'same',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          scrollbar: {
            vertical: 'auto',
            horizontal: 'hidden',
          },
        }}
      />
    </div>
  );
};
