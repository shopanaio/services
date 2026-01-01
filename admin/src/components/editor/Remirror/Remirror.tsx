/* eslint-disable jsx-a11y/no-autofocus */

import {
  BoldExtension,
  NodeFormattingExtension,
  BulletListExtension,
  HeadingExtension,
  ItalicExtension,
  LinkExtension,
  OrderedListExtension,
  StrikeExtension,
  UnderlineExtension,
  HorizontalRuleExtension,
} from 'remirror/extensions';
import { Remirror, useRemirror } from '@remirror/react';
import { Flex } from '@components/utility/Flex';
import { BasicFormattingButtonGroup } from '@components/editor/Remirror/BasicFormattingButtonGroup';
import { TextAlignmentButtonGroup } from '@components/editor/Remirror/TextAlignButtonGroup';
import { HeadingLevelButtonGroup } from '@components/editor/Remirror/HeadingLevelButtonGroup';
import { ListButtonGroup } from '@components/editor/Remirror/ListButtonGroup';
import { remirrorStyles } from '@components/editor/Remirror/styes';
import { CSSProperties, useRef } from 'react';
import { LinkGroup } from '@components/editor/Remirror/LinkGroup';

import {
  ISaveButtonGroupProps,
  SaveButtonGroup,
} from '@components/editor/Remirror/SaveButtonGroup';
import { RemirrorJSON } from 'remirror';
import { emptyRemirrorJSON } from '@components/editor/Remirror/utils';

const extensions = () => [
  new HeadingExtension({}),
  new BoldExtension({}),
  new ItalicExtension(),
  new UnderlineExtension(),
  new StrikeExtension(),
  new NodeFormattingExtension({}),
  new HorizontalRuleExtension({}),
  new LinkExtension({ autoLink: true }),
  new BulletListExtension({ enableSpine: true }),
  new OrderedListExtension(),
];

export type RichTextEditorProps = {
  initialContent: RemirrorJSON | null;
  placeholder?: string;
  autoFocus?: boolean;
  height?: string | string;
  onClick?: () => void;
  editable?: boolean;
} & Omit<ISaveButtonGroupProps, 'state'>;

const RichTextEditor = ({
  height,
  editable,
  onClick,
  placeholder,
  initialContent,
  onCancel,
  onSave,
}: RichTextEditorProps): JSX.Element => {
  const { current: content } = useRef(initialContent);

  const { manager, state, onChange } = useRemirror({
    selection: 'end',
    extensions: extensions,
    content: content || emptyRemirrorJSON,
  });

  return (
    <div
      css={remirrorStyles.container}
      data-testid="rich-text-editor-container"
    >
      <div
        className={editable ? 'editable' : ''}
        onClick={onClick}
        data-testid="rich-text-editor"
        css={remirrorStyles.editor}
        style={
          {
            ...(height ? { '--editor-max-height': height } : {}),
          } as CSSProperties
        }
      >
        <Remirror
          manager={manager}
          onChange={onChange}
          initialContent={state}
          autoRender="end"
          placeholder={placeholder}
        >
          <Flex gap="4" css={remirrorStyles.toolbar}>
            <HeadingLevelButtonGroup />
            <BasicFormattingButtonGroup />
            <TextAlignmentButtonGroup />
            <ListButtonGroup />
            <LinkGroup />
            {/* <HistoryButtonGroup /> */}
          </Flex>
        </Remirror>
      </div>
      {editable && (
        <SaveButtonGroup state={state} onCancel={onCancel} onSave={onSave} />
      )}
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default RichTextEditor;
