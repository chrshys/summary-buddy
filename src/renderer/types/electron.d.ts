export type Channels =
  | 'ipc-example'
  | 'start-recording'
  | 'stop-recording'
  | 'get-recordings-path'
  | 'set-recordings-path'
  | 'browse-for-folder'
  | 'open-recordings-folder'
  | 'list-recordings'
  | 'play-recording'
  | 'delete-recording'
  | 'transcribe-recording'
  | 'create-summary'
  | 'create-action-items'
  | 'file-exists'
  | 'read-file'
  | 'update-recording-title'
  | 'save-manual-notes'
  | 'get-manual-notes'
  | 'get-audio-duration'
  | 'get-api-key'
  | 'set-api-key'
  | 'set-always-on-top'
  | 'get-pinned-state'
  | 'get-system-audio-source'
  | 'open-transcript';

export interface RecordingInfo {
  name: string;
  path: string;
  date: string;
  duration: number;
}

export interface IElectronAPI {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]): void;
    sendMessage(
      channel: 'open-transcript',
      data: { content: string; title: string },
    ): void;
    on(
      channel:
        | Channels
        | 'audio-level'
        | 'recording-started'
        | 'recording-stopped'
        | 'recording-error',
      func: (...args: unknown[]) => void,
    ): () => void;
    once(channel: Channels, func: (...args: unknown[]) => void): void;
    removeListener(
      channel: Channels | 'audio-level',
      func: (...args: unknown[]) => void,
    ): void;
  };
  audioRecorder: {
    startRecording: () => Promise<{
      success?: boolean;
      error?: string;
      outputPath?: string;
    }>;
    stopRecording: () => Promise<{ success?: boolean; error?: string }>;
    getRecordingsPath: () => Promise<{ path: string }>;
    openRecordingsFolder: () => Promise<void>;
    setRecordingsPath: (
      path: string,
    ) => Promise<{ success?: boolean; error?: string }>;
    browseForFolder: () => Promise<{ path: string | null }>;
    getApiKey: () => Promise<{ key: string | null; error?: string }>;
    setApiKey: (key: string) => Promise<{ success?: boolean; error?: string }>;
    setAlwaysOnTop: (
      shouldPin: boolean,
    ) => Promise<{ success?: boolean; error?: string }>;
    getPinnedState: () => Promise<{ isPinned: boolean; error?: string }>;
    listRecordings: () => Promise<{
      recordings: RecordingInfo[];
      error?: string;
    }>;
    playRecording: (
      path: string,
    ) => Promise<{ success?: boolean; error?: string }>;
    getAudioDuration: (
      path: string,
    ) => Promise<{ duration: number; error?: string }>;
    deleteRecording: (
      path: string,
    ) => Promise<{ success?: boolean; error?: string }>;
    transcribeRecording: (
      path: string,
    ) => Promise<{ success?: boolean; text?: string; error?: string }>;
    createSummary: (
      path: string,
    ) => Promise<{ success?: boolean; summary?: string; error?: string }>;
    createActionItems: (
      path: string,
    ) => Promise<{ success?: boolean; actionItems?: string; error?: string }>;
    updateRecordingTitle: (
      path: string,
      title: string,
    ) => Promise<{ success?: boolean; error?: string }>;
    fileExists: (path: string) => Promise<boolean>;
    getRecordingPaths: (recordingPath: string) => Promise<{
      transcriptPath: string | null;
      summaryPath: string | null;
      actionItemsPath: string | null;
    }>;
    saveManualNotes: (
      path: string,
      notes: string,
    ) => Promise<{ success?: boolean; error?: string }>;
    getManualNotes: (
      path: string,
    ) => Promise<{ notes?: string; error?: string }>;
  };
  fileSystem: {
    exists: (filePath: string) => Promise<boolean>;
    readFile: (filePath: string) => Promise<string>;
  };
  createSummary: (filePath: string) => Promise<{
    success?: boolean;
    notes?: string;
    error?: string;
  }>;
  onNotesGenerated: (
    callback: (data: { path: string; notes: string }) => void,
  ) => void;
}

declare global {
  interface Window {
    electron: IElectronAPI;
  }
}
