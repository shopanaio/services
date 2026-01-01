/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import { HiOutlineArrowsExpand } from 'react-icons/hi';
import { ColorDropdown } from '@components/editor/ColorDropdown';
import { LinkDropdown } from '@components/editor/LinkDropdown';
import {
  buttonActiveHoverCss,
  buttonHoverCss,
  s,
} from '@components/editor/styles';
import { css } from '@emotion/react';

import { useRef, useState, useEffect, MouseEvent } from 'react';

import ReactQuill, { Range } from 'react-quill';
import 'react-quill/dist/quill.core.css';
import './setupQuill';
import { Flex } from '@components/utility/Flex';
import { Button, Dropdown, Select, Space, Typography } from 'antd';
import {
  MdArrowDropDown,
  MdClose,
  MdOutlineFormatAlignCenter,
  MdOutlineFormatAlignLeft,
  MdOutlineFormatAlignRight,
  MdOutlineFormatBold,
  MdOutlineFormatItalic,
  MdOutlineFormatListBulleted,
  MdOutlineFormatListNumbered,
  MdOutlineFormatStrikethrough,
  MdOutlineFormatUnderlined,
  MdRedo,
  MdUndo,
} from 'react-icons/md';

const initialFormatting = {
  bold: false,
  italic: false,
  code: false,
  underline: false,
  strike: false,
  header: false,
  align: '',
  color: '',
  size: false,
  link: false,
  list: false,
  weight: false,
} as const;

interface IFormatting {
  bold: boolean;
  code: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  header: string | false;
  align: '' | 'center' | 'right';
  list: 'bullet' | 'ordered' | false;
  color: string;
  link: boolean;
  size: string | false;
  weight: string | false;
}

type RichTextEditorProps = {
  value: string;
  placeholder?: string;
  onChange: (content: string) => void;
  formats?: {
    size?: boolean;
    weight?: boolean;
    align?: boolean;
  };
  onExpand?: () => void;
  autoFocus?: boolean;
  readOnly?: boolean;
  maxHeight?: number | null;
  height?: number | string;
  onChangeText?: (value: string) => void;
  'data-testid'?: string;
};

const RichTextEditor = ({
  value: editorValue,
  onChange,
  formats: formatsProp,
  placeholder,
  readOnly,
  onExpand,
  maxHeight,
  height = '100%',
  onChangeText,
  'data-testid': dataTestId,
}: // autoFocus,
RichTextEditorProps) => {
  const quillRef = useRef<ReactQuill | null>(null);
  const [formats, setFormats] = useState<IFormatting>(initialFormatting);
  const [linkHref, setLinkHref] = useState('');

  const getEditor = () => {
    return quillRef.current!.getEditor();
  };

  const handleBlur = () => {
    if (typeof onChangeText === 'function') {
      onChangeText(getEditor()?.getText?.() || '');
    }
  };

  const formatText = (format: string, value: any) => {
    const quill = getEditor();

    setFormats((prevFormats) => ({ ...prevFormats, [format]: value }));
    quill.format(format, value);
  };

  useEffect(() => {
    if (!quillRef.current) {
      return;
    }

    const quill = quillRef.current.getEditor();

    const onRangeChange = (range?: Range) => {
      if (!range) {
        return;
      }

      const currentFormats = quill.getFormat(range);

      setFormats({
        align: currentFormats.align || '',
        bold: currentFormats.bold || false,
        color: currentFormats.color || '',
        header: currentFormats.header || false,
        italic: currentFormats.italic || false,
        link: currentFormats.link || false,
        list: currentFormats.size || false,
        size: currentFormats.size || false,
        strike: currentFormats.strike || false,
        underline: currentFormats.underline || false,
        weight: currentFormats.weight || false,
        code: currentFormats['code-block'] || '',
      });
    };

    quill.on('selection-change', onRangeChange);

    return () => {
      quill.off('selection-change', onRangeChange);
    };
  }, []);

  return (
    <div
      data-testid={dataTestId}
      css={s.editor}
      onClick={() => getEditor().focus()}
      style={{
        ...(typeof maxHeight !== 'number'
          ? {
              height: '100%',
              minHeight: height,
              maxHeight: '100%',
              overflow: 'auto',
            }
          : {
              height: '100%',
              minHeight: height,
              maxHeight: maxHeight,
              overflow: 'auto',
            }),
      }}
    >
      <div css={s.toolbar}>
        <Dropdown
          trigger={['click']}
          menu={{
            items: ['1', '2', '3', '4'].map((option) => ({
              label: `H${option}`,
              key: option,
              onClick: () => formatText('header', option),
            })),
          }}
        >
          <Button css={s.toolbarSelect} color="secondary" type="text">
            <Flex align="center" justify="space-between">
              {formats.header ? (
                <Typography.Text strong>{`H${formats.header}`}</Typography.Text>
              ) : (
                <Typography.Text
                  css={css`
                    font-style: italic;
                  `}
                >
                  Heading
                </Typography.Text>
              )}
              <Flex align="center" gap="1">
                {formats.header && (
                  <MdClose
                    onClick={(e: MouseEvent) => {
                      e.stopPropagation();
                      formatText('header', false);
                    }}
                  />
                )}
                <MdArrowDropDown size={20} />
              </Flex>
            </Flex>
          </Button>
        </Dropdown>
        {formatsProp?.size && (
          <Select
            css={s.toolbarSelect}
            placeholder="Select size"
            allowClear
            onChange={(value) => formatText('size', value)}
            onClear={() => formatText('size', false)}
            options={[
              { value: 'xxs', label: 'xxs' },
              { value: 'xs', label: 'xs' },
              { value: 's', label: 's' },
              { value: 'm', label: 'm' },
              { value: 'l', label: 'l' },
              { value: 'xl', label: 'xl' },
              { value: 'xxl', label: 'xxl' },
            ]}
            value={typeof formats.size === 'string' ? formats.size : ''}
          />
        )}
        {formatsProp?.weight && (
          <Select
            css={s.toolbarSelect}
            placeholder="Select weight"
            allowClear
            // getOptionLabel={capitalize}
            onChange={(value) => formatText('font-weight', value)}
            onClear={() => formatText('weight', false)}
            options={[
              { value: 'regular', label: 'regular' },
              { value: 'medium', label: 'medium' },
              { value: 'semibold', label: 'semibold' },
              { value: 'bold', label: 'bold' },
            ]}
            value={typeof formats.weight === 'string' ? formats.weight : ''}
          />
        )}
        <Space.Compact>
          <Button
            icon={<MdOutlineFormatBold size={20} />}
            type="text"
            css={[formats.bold ? buttonActiveHoverCss : buttonHoverCss]}
            onClick={() => formatText('bold', !formats.bold)}
          />
          <Button
            icon={<MdOutlineFormatItalic size={20} />}
            type="text"
            css={[formats.italic ? buttonActiveHoverCss : buttonHoverCss]}
            onClick={() => formatText('italic', !formats.italic)}
          />
          <Button
            icon={<MdOutlineFormatUnderlined size={20} />}
            type="text"
            css={[formats.underline ? buttonActiveHoverCss : buttonHoverCss]}
            onClick={() => formatText('underline', !formats.underline)}
          />
          <Button
            icon={<MdOutlineFormatStrikethrough size={20} />}
            type="text"
            css={[formats.strike ? buttonActiveHoverCss : buttonHoverCss]}
            onClick={() => formatText('strike', !formats.strike)}
          />
        </Space.Compact>
        {/* Aligning */}
        <Space.Compact>
          <Button
            icon={<MdOutlineFormatAlignLeft size={20} />}
            type="text"
            onClick={() => formatText('align', '')}
            color="secondary"
          />
          <Button
            color="secondary"
            icon={<MdOutlineFormatAlignCenter size={20} />}
            type="text"
            css={[
              formats.align === 'center'
                ? buttonActiveHoverCss
                : buttonHoverCss,
            ]}
            onClick={() => formatText('align', 'center')}
          />
          <Button
            icon={<MdOutlineFormatAlignRight size={20} />}
            css={[
              formats.align === 'right' ? buttonActiveHoverCss : buttonHoverCss,
            ]}
            type="text"
            color="secondary"
            onClick={() => formatText('align', 'right')}
          />
        </Space.Compact>

        {/* Lists */}
        <Space.Compact>
          <Button
            type="text"
            icon={<MdOutlineFormatListBulleted size={20} />}
            css={[
              formats.list === 'bullet' ? buttonActiveHoverCss : buttonHoverCss,
            ]}
            onClick={() =>
              formatText('list', formats.list === 'bullet' ? false : 'bullet')
            }
          />
          <Button
            icon={<MdOutlineFormatListNumbered size={20} />}
            type="text"
            css={[
              formats.list === 'ordered'
                ? buttonActiveHoverCss
                : buttonHoverCss,
            ]}
            onClick={() =>
              formatText('list', formats.list === 'ordered' ? false : 'ordered')
            }
          />
          <LinkDropdown
            isActive={!!formats.link}
            value={linkHref}
            onChange={setLinkHref}
            onSubmit={() => formatText('link', linkHref)}
            onOpen={() => {
              const quill = getEditor();
              const range = quill.getSelection();
              if (!range || !quill.getFormat(range)?.link) {
                setLinkHref('');
                return;
              }

              let node = quill.getLeaf(range.index)?.[0]?.parent;
              while (node) {
                if (node.domNode.tagName === 'A') {
                  setLinkHref(node.domNode.getAttribute('href'));
                  break;
                }

                node = node.parent;
              }
            }}
          />
          <ColorDropdown
            value={formats.color}
            onChange={(value: string) => formatText('color', value)}
          />
        </Space.Compact>
        {/* History */}
        <Space.Compact>
          <Button
            type="text"
            icon={<MdUndo size={20} />}
            color="secondary"
            css={[buttonHoverCss]}
            onClick={() => {
              // @ts-expect-error
              getEditor().history.undo();
            }}
          />
          <Button
            type="text"
            icon={<MdRedo size={20} />}
            color="secondary"
            css={[buttonHoverCss]}
            onClick={() => {
              // @ts-expect-error
              getEditor().history.redo();
            }}
          />
        </Space.Compact>
        {onExpand && (
          <Button
            icon={<HiOutlineArrowsExpand size={20} />}
            type="text"
            color="secondary"
            css={[
              buttonHoverCss,
              css`
                margin-left: auto;
              `,
            ]}
            onClick={onExpand}
          />
        )}
      </div>
      <ReactQuill
        readOnly={readOnly}
        ref={quillRef}
        value={editorValue}
        onChange={onChange}
        placeholder={placeholder}
        onBlur={handleBlur}
        css={css`
          min-height: calc(100% - 80px);
        `}
        // @ts-expect-error
        theme={null}
        modules={{
          clipboard: {
            matchVisual: false,
          },
          history: {
            delay: 2000,
            maxStack: 10,
          },
        }}
      />
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default RichTextEditor;
