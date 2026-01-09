import type { OutputData } from "@editorjs/editorjs";
import type { AIGenerateTarget, AITone } from "../../modals";

export interface IAIWriterForm {
  target: AIGenerateTarget;
  tone: AITone;
  instructions: string;
}

export interface IGeneratedContent {
  description: OutputData | null;
  excerpt: OutputData | null;
}

export interface IGenerateParams {
  productContext: {
    title: string;
    category: string | null;
    attributes: string[];
    price: number;
  };
  target: AIGenerateTarget;
  tone: AITone;
  instructions: string;
}
