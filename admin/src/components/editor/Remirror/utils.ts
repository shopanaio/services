import {
  EditorState,
  NULL_CHARACTER,
  prosemirrorNodeToHtml,
  RemirrorJSON,
} from 'remirror';

export const remirrorStateUtil = {
  getJSON(state: EditorState): RemirrorJSON {
    return state.doc.toJSON();
  },
  getHTML(state: EditorState): string {
    return prosemirrorNodeToHtml(state.doc);
  },
  getText(state: EditorState): string {
    return state.doc.textBetween(
      0,
      state.doc.content.size,
      '\n\n',
      NULL_CHARACTER,
    );
  },
};

export const emptyRemirrorJSON: RemirrorJSON = {
  type: 'doc',
  content: [],
};
