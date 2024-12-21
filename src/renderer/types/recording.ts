export interface Recording {
  name: string;
  path: string;
  date: string;
  duration: number;
  title?: string | null;
  isActive?: boolean;
  folderPath?: string;
  hasAiSummary?: boolean;
  aiNotes?: string;
  manualNotes?: string;
}
