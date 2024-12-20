interface IElectronAPI {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]): void;
    on(
      channel: Channels | 'audio-level',
      func: (...args: unknown[]) => void,
    ): () => void;
    once(channel: Channels, func: (...args: unknown[]) => void): void;
    removeListener(
      channel: Channels | 'audio-level',
      func: (...args: unknown[]) => void,
    ): void;
  };
  audioRecorder: {
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<void>;
    playRecording: (filePath: string) => Promise<void>;
    stopPlaying: () => Promise<void>;
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
}

declare global {
  interface Window {
    electron: IElectronAPI;
  }
}
