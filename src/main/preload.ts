// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels =
  | 'ipc-example'
  | 'start-recording'
  | 'stop-recording'
  | 'recording-error';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels | 'audio-level', func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
    removeListener(
      channel: Channels | 'audio-level',
      func: (...args: unknown[]) => void,
    ) {
      ipcRenderer.removeListener(channel, (_event, ...args) => func(...args));
    },
    getSystemAudioSource: () => ipcRenderer.invoke('get-system-audio-source'),
  },
  audioRecorder: {
    startRecording: () => ipcRenderer.invoke('start-recording'),
    stopRecording: () => ipcRenderer.invoke('stop-recording'),
    getRecordingsPath: () => ipcRenderer.invoke('get-recordings-path'),
    openRecordingsFolder: () => ipcRenderer.invoke('open-recordings-folder'),
    setRecordingsPath: (path: string) =>
      ipcRenderer.invoke('set-recordings-path', path),
    browseForFolder: () => ipcRenderer.invoke('browse-for-folder'),
    getApiKey: (provider: 'openai' | 'assemblyai' = 'openai') =>
      ipcRenderer.invoke('get-api-key', provider),
    setApiKey: (key: string, provider: 'openai' | 'assemblyai' = 'openai') =>
      ipcRenderer.invoke('set-api-key', key, provider),
    setAlwaysOnTop: (shouldPin: boolean) =>
      ipcRenderer.invoke('set-always-on-top', shouldPin),
    getPinnedState: () => ipcRenderer.invoke('get-pinned-state'),
    listRecordings: () => ipcRenderer.invoke('list-recordings'),
    playRecording: (path: string) => ipcRenderer.invoke('play-recording', path),
    deleteRecording: (path: string) =>
      ipcRenderer.invoke('delete-recording', path),
    transcribeRecording: (path: string) =>
      ipcRenderer.invoke('transcribe-recording', path),
    createSummary: (path: string) => ipcRenderer.invoke('create-summary', path),
    createActionItems: (path: string) =>
      ipcRenderer.invoke('create-action-items', path),
    updateRecordingTitle: (path: string, title: string) =>
      ipcRenderer.invoke('update-recording-title', { path, title }),
    getRecordingPaths: (recordingPath: string) =>
      ipcRenderer.invoke('get-recording-paths', recordingPath),
  },
  fileSystem: {
    exists: (filePath: string) => ipcRenderer.invoke('file-exists', filePath),
    readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  },
  createSummary: async (filePath: string) => {
    const result = await ipcRenderer.invoke('create-summary', filePath);
    return result;
  },
  onNotesGenerated: (
    callback: (data: { path: string; notes: string }) => void,
  ) => {
    ipcRenderer.on('notes-generated', (_event, data) => callback(data));
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
