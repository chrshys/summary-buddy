import { ElectronHandler } from '../main/preload';

interface RecordingInfo {
  name: string;
  path: string;
  date: string;
  duration: number;
}

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    electron: ElectronHandler & {
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
        setApiKey: (
          key: string,
        ) => Promise<{ success?: boolean; error?: string }>;
        setAlwaysOnTop: (
          shouldPin: boolean,
        ) => Promise<{ success?: boolean; error?: string }>;
        getPinnedState: () => Promise<{ isPinned: boolean; error?: string }>;
        listRecordings: () => Promise<{ recordings: RecordingInfo[]; error?: string }>;
        playRecording: (path: string) => Promise<{ success?: boolean; error?: string }>;
        deleteRecording: (path: string) => Promise<{ success?: boolean; error?: string }>;
        transcribeRecording: (path: string) => Promise<{ success?: boolean; text?: string; error?: string }>;
      };
      ipcRenderer: {
        on(channel: 'recording-started' | 'recording-stopped' | 'audio-level', func: (...args: any[]) => void): () => void;
        // ... other methods
      };
    };
  }
}

export {};
