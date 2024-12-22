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
        getAudioDuration: (path: string) => Promise<{ duration: number; error?: string }>;
        deleteRecording: (path: string) => Promise<{ success?: boolean; error?: string }>;
        transcribeRecording: (path: string) => Promise<{ success?: boolean; text?: string; error?: string }>;
        createSummary: (path: string) => Promise<{ success?: boolean; summary?: string; error?: string }>;
        createActionItems: (path: string) => Promise<{ success?: boolean; actionItems?: string; error?: string }>;
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
      };
      ipcRenderer: {
        on(
          channel: 'audio-level' | 'recording-started' | 'recording-stopped' | 'recording-error',
          func: (...args: any[]) => void,
        ): () => void;
        // ... other methods
      };
      createSummary: (filePath: string) => Promise<{
        success?: boolean;
        notes?: string;
        error?: string;
      }>;
      onNotesGenerated: (callback: (data: { path: string; notes: string }) => void) => void;
    };
  }
}

interface IElectronAPI {
  // ... existing declarations
  sendMessage(channel: 'open-transcript', data: { content: string; title: string }): void;
}

export {};
