export interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export interface ImportedChat {
  id: string;
  title: string;
  source: string;
  url?: string;
  importedAt: number;
  messages: Message[];
}

export interface OptimizationResult {
  optimizedPrompt: string;
  summary: string;
  compactedContext: string;
}
