declare module "@editorjs/paragraph" {
  import { BlockTool, BlockToolConstructorOptions } from "@editorjs/editorjs";
  export default class Paragraph implements BlockTool {
    constructor(config: BlockToolConstructorOptions);
    render(): HTMLElement;
    save(block: HTMLElement): { text: string };
    static get toolbox(): { title: string; icon: string };
  }
}

declare module "@editorjs/header" {
  import { BlockTool, BlockToolConstructorOptions } from "@editorjs/editorjs";
  export default class Header implements BlockTool {
    constructor(config: BlockToolConstructorOptions);
    render(): HTMLElement;
    save(block: HTMLElement): { text: string; level: number };
    static get toolbox(): { title: string; icon: string };
  }
}

declare module "@editorjs/list" {
  import { BlockTool, BlockToolConstructorOptions } from "@editorjs/editorjs";
  export default class List implements BlockTool {
    constructor(config: BlockToolConstructorOptions);
    render(): HTMLElement;
    save(block: HTMLElement): { style: string; items: string[] };
    static get toolbox(): { title: string; icon: string };
  }
}

declare module "@editorjs/quote" {
  import { BlockTool, BlockToolConstructorOptions } from "@editorjs/editorjs";
  export default class Quote implements BlockTool {
    constructor(config: BlockToolConstructorOptions);
    render(): HTMLElement;
    save(block: HTMLElement): { text: string; caption: string };
    static get toolbox(): { title: string; icon: string };
  }
}

declare module "@editorjs/delimiter" {
  import { BlockTool, BlockToolConstructorOptions } from "@editorjs/editorjs";
  export default class Delimiter implements BlockTool {
    constructor(config: BlockToolConstructorOptions);
    render(): HTMLElement;
    save(): Record<string, never>;
    static get toolbox(): { title: string; icon: string };
  }
}
