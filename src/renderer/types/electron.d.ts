interface IElectronAPI {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]): void;
    on(
      channel: Channels | 'audio-level' | 'recording-started' | 'recording-stopped' | 'recording-error',
      func: (...args: unknown[]) => void,
    ): () => void;
    once(channel: Channels, func: (...args: unknown[]) => void): void;
    removeListener(
      channel: Channels | 'audio-level',
      func: (...args: unknown[]) => void,
    ): void;
  };
  audioRecorder: {
    startRecording: () => Promise<{ error?: string }>;
    stopRecording: () => Promise<{ error?: string }>;
    playRecording: (filePath: string) => Promise<void>;
    stopPlaying: () => Promise<void>;
    getRecordingsPath: () => Promise<{ path: string }>;
    getPinnedState: () => Promise<{ isPinned: boolean; error?: string }>;
    listRecordings: () => Promise<{ recordings: Recording[]; error?: string }>;
    setAlwaysOnTop: (shouldPin: boolean) => Promise<{ error?: string }>;
    openRecordingsFolder: () => Promise<void>;
    updateRecordingTitle: (path: string, title: string) => Promise<{ error?: string }>;
    saveManualNotes: (path: string, notes: string) => Promise<{ error?: string }>;
    getManualNotes: (path: string) => Promise<{ notes?: string; error?: string }>;
    transcribe: (filePath: string) => Promise<{
      error?: string;
      success?: boolean;
      text?: string;
      segments?: DiarizedSegment[];
    }>;
    createSummary: (filePath: string) => Promise<{
      error?: string;
      success?: boolean;
      summary?: string;
    }>;
    createActionItems: (filePath: string) => Promise<{
      error?: string;
      success?: boolean;
      actionItems?: string;
    }>;
    getRecordings: () => Promise<Recording[]>;
    deleteRecording: (filePath: string) => Promise<void>;
  };
  fileSystem: {
    exists: (filePath: string) => Promise<boolean>;
    readFile: (filePath: string) => Promise<string>;
  };
  createSummary: (path: string) => Promise<{ notes?: string; error?: string }>;
  onNotesGenerated: (handler: (data: { path: string; notes: string }) => void) => void;
}

declare global {
  interface Window {
    electron: IElectronAPI;
  }
}

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
